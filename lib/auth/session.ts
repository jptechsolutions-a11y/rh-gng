import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHash, randomBytes } from 'crypto';
import { eq, lt } from 'drizzle-orm';
import { db, schema } from '@/db/client';

import { SESSION_COOKIE } from './constants';
export { SESSION_COOKIE };
const TTL_HOURS = 8;             // sessão padrão (cookie de sessão — apagado ao fechar o navegador)
const TTL_HOURS_LEMBRAR = 24 * 30; // 30 dias quando "Lembrar senha" marcado

export type FilialSession = { perfil: 'filial'; token: string; filialId: string; filialCodigo: string; filialNome: string };
export type AdminSession  = { perfil: 'admin';  token: string; adminId: string; usuario: string; nome: string | null };
export type VisualizadorSession = {
  perfil: 'visualizador';
  token: string;
  usuarioAcessoId: string;
  usuario: string;
  nome: string;
  escopo: 'lista' | 'nacional';
  filiaisIds: string[];      // vazio quando escopo='nacional'
  filiaisCodigos: string[];  // vazio quando escopo='nacional'
};
export type Session = FilialSession | AdminSession | VisualizadorSession;

/**
 * Retorna o conjunto de filial_ids visíveis no detalhamento (próprio recorte do usuário).
 * `null` significa "todas" (admin ou visualizador nacional).
 */
export function getFiliaisVisiveis(s: Session): string[] | null {
  if (s.perfil === 'admin') return null;
  if (s.perfil === 'filial') return [s.filialId];
  if (s.escopo === 'nacional') return null;
  return s.filiaisIds;
}

/**
 * Variante por código (texto) das filiais visíveis. Mesma semântica de
 * getFiliaisVisiveis: `null` = todas; `[]` = nenhuma. Usada em tabelas que
 * armazenam o filial_codigo em vez do filial_id (ex.: escuta_reunioes).
 */
export function getFiliaisCodigosVisiveis(s: Session): string[] | null {
  if (s.perfil === 'admin') return null;
  if (s.perfil === 'filial') return [s.filialCodigo];
  if (s.escopo === 'nacional') return null;
  return s.filiaisCodigos;
}

/**
 * Escopo do ranking cross-filial (resumos comparativos por filial).
 * Difere de getFiliaisVisiveis apenas para perfil filial: filial vê todos no ranking
 * (para comparar-se às outras), enquanto seu detalhamento é restrito.
 */
export function getFiliaisRanking(s: Session): string[] | null {
  if (s.perfil === 'admin') return null;
  if (s.perfil === 'filial') return null;
  if (s.escopo === 'nacional') return null;
  return s.filiaisIds;
}

/** Verifica se a sessão tem privilégios administrativos. */
export function isAdmin(s: Session): s is AdminSession {
  return s.perfil === 'admin';
}

function genToken() {
  return randomBytes(48).toString('base64url'); // 64 chars
}

// No banco guardamos apenas o SHA-256 do token; o cookie carrega o token bruto.
// Assim, um vazamento do dump de `sessoes` não permite sequestrar sessões ativas.
const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

export async function createSession(opts:
  | { perfil: 'filial'; filialId: string; lembrar?: boolean }
  | { perfil: 'admin'; adminId: string; lembrar?: boolean }
  | { perfil: 'visualizador'; usuarioAcessoId: string; lembrar?: boolean }
) {
  const token = genToken();
  const horas = opts.lembrar ? TTL_HOURS_LEMBRAR : TTL_HOURS;
  const expira = new Date(Date.now() + horas * 3600 * 1000);
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const ua = h.get('user-agent') ?? null;

  await db.insert(schema.sessoes).values({
    token: hashToken(token),
    perfil: opts.perfil,
    filialId: opts.perfil === 'filial' ? opts.filialId : null,
    adminId:  opts.perfil === 'admin'  ? opts.adminId  : null,
    usuarioAcessoId: opts.perfil === 'visualizador' ? opts.usuarioAcessoId : null,
    ip, userAgent: ua, expiraEm: expira,
  });

  const c = await cookies();
  // Cookie Secure sempre, exceto quando rodando localmente em dev (http localhost).
  const isLocal = h.get('host')?.startsWith('localhost') ?? false;
  // Sem `expires` → cookie de sessão (apagado ao fechar o navegador → pedirá senha novamente).
  // Com `expires` → cookie persistente até a data definida.
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: !isLocal,
    sameSite: 'lax',
    path: '/',
    ...(opts.lembrar ? { expires: expira } : {}),
  });
  return token;
}

// Cache in-memory por instance da function. Sessão expira em 8h–30d;
// um TTL de 60s no cache poupa um lookup no banco em CADA navegação sem
// abrir janela perceptível para sessão revogada. Em destroySession invalidamos
// localmente — em outras instances a stale window fica limitada ao TTL.
const SESSION_CACHE_TTL_MS = 60_000;
type CacheEntry = { value: Session | null; expiresAt: number };
declare global {
  // eslint-disable-next-line no-var
  var __sessionCache: Map<string, CacheEntry> | undefined;
}
const sessionCache: Map<string, CacheEntry> =
  globalThis.__sessionCache ?? (globalThis.__sessionCache = new Map());

export async function destroySession() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) {
    sessionCache.delete(token);
    await db.delete(schema.sessoes).where(eq(schema.sessoes.token, hashToken(token)));
  }
  c.delete(SESSION_COOKIE);
}

export const getSession = cache(async (): Promise<Session | null> => {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const cached = sessionCache.get(token);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  const rows = await db
    .select({
      token: schema.sessoes.token,
      perfil: schema.sessoes.perfil,
      expiraEm: schema.sessoes.expiraEm,
      filialId: schema.sessoes.filialId,
      adminId: schema.sessoes.adminId,
      usuarioAcessoId: schema.sessoes.usuarioAcessoId,
      filialCodigo: schema.filiais.codigo,
      filialNome: schema.filiais.nome,
      adminUsuario: schema.admins.usuario,
      adminNome: schema.admins.nome,
      uaUsuario: schema.usuariosAcesso.usuario,
      uaNome: schema.usuariosAcesso.nome,
      uaEscopo: schema.usuariosAcesso.escopo,
      uaAtivo: schema.usuariosAcesso.ativo,
    })
    .from(schema.sessoes)
    .leftJoin(schema.filiais, eq(schema.filiais.id, schema.sessoes.filialId))
    .leftJoin(schema.admins,  eq(schema.admins.id,  schema.sessoes.adminId))
    .leftJoin(schema.usuariosAcesso, eq(schema.usuariosAcesso.id, schema.sessoes.usuarioAcessoId))
    .where(eq(schema.sessoes.token, hashToken(token)))
    .limit(1);

  const s = rows[0];
  const cacheTtl = Math.min(SESSION_CACHE_TTL_MS, Math.max(0, (s?.expiraEm.getTime() ?? 0) - now));
  const store = (value: Session | null) => {
    sessionCache.set(token, { value, expiresAt: now + (value ? cacheTtl : SESSION_CACHE_TTL_MS) });
    return value;
  };
  if (!s) return store(null);
  if (s.expiraEm.getTime() < now) {
    sessionCache.delete(token);
    await db.delete(schema.sessoes).where(eq(schema.sessoes.token, hashToken(token)));
    return null;
  }

  if (s.perfil === 'filial' && s.filialId && s.filialCodigo && s.filialNome) {
    return store({
      perfil: 'filial', token,
      filialId: s.filialId, filialCodigo: s.filialCodigo, filialNome: s.filialNome,
    });
  }
  if (s.perfil === 'admin' && s.adminId && s.adminUsuario) {
    return store({
      perfil: 'admin', token,
      adminId: s.adminId, usuario: s.adminUsuario, nome: s.adminNome,
    });
  }
  if (s.perfil === 'visualizador' && s.usuarioAcessoId && s.uaUsuario && s.uaEscopo && s.uaAtivo) {
    let filiaisIds: string[] = [];
    let filiaisCodigos: string[] = [];
    if (s.uaEscopo === 'lista') {
      const rows2 = await db
        .select({
          filialId: schema.usuariosAcessoFiliais.filialId,
          codigo: schema.filiais.codigo,
        })
        .from(schema.usuariosAcessoFiliais)
        .leftJoin(schema.filiais, eq(schema.filiais.id, schema.usuariosAcessoFiliais.filialId))
        .where(eq(schema.usuariosAcessoFiliais.usuarioAcessoId, s.usuarioAcessoId));
      filiaisIds = rows2.map((r) => r.filialId);
      filiaisCodigos = rows2.map((r) => r.codigo).filter((c): c is string => !!c);
    }
    return store({
      perfil: 'visualizador', token,
      usuarioAcessoId: s.usuarioAcessoId,
      usuario: s.uaUsuario,
      nome: s.uaNome ?? s.uaUsuario,
      escopo: s.uaEscopo === 'nacional' ? 'nacional' : 'lista',
      filiaisIds,
      filiaisCodigos,
    });
  }
  return store(null);
});

export async function requireSession(perfilEsperado: 'filial'): Promise<FilialSession>;
export async function requireSession(perfilEsperado: 'admin'):  Promise<AdminSession>;
export async function requireSession(perfilEsperado: 'visualizador'): Promise<VisualizadorSession>;
export async function requireSession(): Promise<Session>;
export async function requireSession(perfilEsperado?: 'filial' | 'admin' | 'visualizador'): Promise<Session> {
  const s = await getSession();
  if (!s) throw new Error('UNAUTHENTICATED');
  if (perfilEsperado && s.perfil !== perfilEsperado) {
    // Visualizador (read-only multi-filial) é redirecionado para os indicadores
    // quando tenta acessar rotas restritas a admin ou filial. Outros perfis
    // seguem o comportamento original (erro) para preservar contrato anterior.
    if (s.perfil === 'visualizador') redirect('/indicadores?tab=inicio');
    throw new Error('FORBIDDEN');
  }
  return s;
}

// Cleanup (chamar periodicamente)
export async function purgeExpiredSessions() {
  await db.delete(schema.sessoes).where(lt(schema.sessoes.expiraEm, new Date()));
}
