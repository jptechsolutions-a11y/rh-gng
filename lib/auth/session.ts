import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { randomBytes } from 'crypto';
import { eq, lt } from 'drizzle-orm';
import { db, schema } from '@/db/client';

import { SESSION_COOKIE } from './constants';
export { SESSION_COOKIE };
const TTL_HOURS = 8;             // sessão padrão (cookie de sessão — apagado ao fechar o navegador)
const TTL_HOURS_LEMBRAR = 24 * 30; // 30 dias quando "Lembrar senha" marcado

export type FilialSession = { perfil: 'filial'; token: string; filialId: string; filialCodigo: string; filialNome: string };
export type AdminSession  = { perfil: 'admin';  token: string; adminId: string; usuario: string; nome: string | null };
export type Session = FilialSession | AdminSession;

function genToken() {
  return randomBytes(48).toString('base64url'); // 64 chars
}

export async function createSession(opts:
  | { perfil: 'filial'; filialId: string; lembrar?: boolean }
  | { perfil: 'admin'; adminId: string; lembrar?: boolean }
) {
  const token = genToken();
  const horas = opts.lembrar ? TTL_HOURS_LEMBRAR : TTL_HOURS;
  const expira = new Date(Date.now() + horas * 3600 * 1000);
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const ua = h.get('user-agent') ?? null;

  await db.insert(schema.sessoes).values({
    token,
    perfil: opts.perfil,
    filialId: opts.perfil === 'filial' ? opts.filialId : null,
    adminId:  opts.perfil === 'admin'  ? opts.adminId  : null,
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
    await db.delete(schema.sessoes).where(eq(schema.sessoes.token, token));
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
      filialCodigo: schema.filiais.codigo,
      filialNome: schema.filiais.nome,
      adminUsuario: schema.admins.usuario,
      adminNome: schema.admins.nome,
    })
    .from(schema.sessoes)
    .leftJoin(schema.filiais, eq(schema.filiais.id, schema.sessoes.filialId))
    .leftJoin(schema.admins,  eq(schema.admins.id,  schema.sessoes.adminId))
    .where(eq(schema.sessoes.token, token))
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
    await db.delete(schema.sessoes).where(eq(schema.sessoes.token, token));
    return null;
  }

  if (s.perfil === 'filial' && s.filialId && s.filialCodigo && s.filialNome) {
    return store({
      perfil: 'filial', token: s.token,
      filialId: s.filialId, filialCodigo: s.filialCodigo, filialNome: s.filialNome,
    });
  }
  if (s.perfil === 'admin' && s.adminId && s.adminUsuario) {
    return store({
      perfil: 'admin', token: s.token,
      adminId: s.adminId, usuario: s.adminUsuario, nome: s.adminNome,
    });
  }
  return store(null);
});

export async function requireSession(perfilEsperado: 'filial'): Promise<FilialSession>;
export async function requireSession(perfilEsperado: 'admin'):  Promise<AdminSession>;
export async function requireSession(): Promise<Session>;
export async function requireSession(perfilEsperado?: 'filial' | 'admin'): Promise<Session> {
  const s = await getSession();
  if (!s) throw new Error('UNAUTHENTICATED');
  if (perfilEsperado && s.perfil !== perfilEsperado) throw new Error('FORBIDDEN');
  return s;
}

// Cleanup (chamar periodicamente)
export async function purgeExpiredSessions() {
  await db.delete(schema.sessoes).where(lt(schema.sessoes.expiraEm, new Date()));
}
