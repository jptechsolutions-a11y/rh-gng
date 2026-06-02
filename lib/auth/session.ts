import 'server-only';
import { cookies, headers } from 'next/headers';
import { randomBytes } from 'crypto';
import { eq, lt } from 'drizzle-orm';
import { db, schema } from '@/db/client';

import { SESSION_COOKIE } from './constants';
export { SESSION_COOKIE };
const TTL_HOURS = 8;

export type FilialSession = { perfil: 'filial'; token: string; filialId: string; filialCodigo: string; filialNome: string };
export type AdminSession  = { perfil: 'admin';  token: string; adminId: string; usuario: string; nome: string | null };
export type Session = FilialSession | AdminSession;

function genToken() {
  return randomBytes(48).toString('base64url'); // 64 chars
}

export async function createSession(opts:
  | { perfil: 'filial'; filialId: string }
  | { perfil: 'admin'; adminId: string }
) {
  const token = genToken();
  const expira = new Date(Date.now() + TTL_HOURS * 3600 * 1000);
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
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expira,
  });
  return token;
}

export async function destroySession() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessoes).where(eq(schema.sessoes.token, token));
  c.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;

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
  if (!s) return null;
  if (s.expiraEm.getTime() < Date.now()) {
    await db.delete(schema.sessoes).where(eq(schema.sessoes.token, token));
    return null;
  }

  if (s.perfil === 'filial' && s.filialId && s.filialCodigo && s.filialNome) {
    return {
      perfil: 'filial', token: s.token,
      filialId: s.filialId, filialCodigo: s.filialCodigo, filialNome: s.filialNome,
    };
  }
  if (s.perfil === 'admin' && s.adminId && s.adminUsuario) {
    return {
      perfil: 'admin', token: s.token,
      adminId: s.adminId, usuario: s.adminUsuario, nome: s.adminNome,
    };
  }
  return null;
}

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
