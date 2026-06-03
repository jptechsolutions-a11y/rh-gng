'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, destroySession } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { loginSchema } from '@/lib/validators';

export type LoginState = { erro?: string } | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    usuario: formData.get('usuario')?.toString(),
    senha: formData.get('senha')?.toString(),
  });
  if (!parsed.success) return { erro: 'Dados inválidos' };

  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await checkRateLimit(`login:${ip}`);
  if (!rl.ok) return { erro: 'Muitas tentativas. Tente novamente em alguns minutos.' };

  const { usuario, senha } = parsed.data;
  const lembrar = formData.get('lembrar') === 'on' || formData.get('lembrar') === 'true';

  if (usuario && usuario.length > 0) {
    const rows = await db.select().from(schema.admins).where(eq(schema.admins.usuario, usuario)).limit(1);
    const adm = rows[0];
    if (adm && (await verifyPassword(adm.senhaHash, senha))) {
      await createSession({ perfil: 'admin', adminId: adm.id, lembrar });
      await db.insert(schema.logAcessos).values({
        usuario: `admin:${adm.usuario}`, acao: 'login', ip,
        userAgent: h.get('user-agent') ?? null,
      });
      redirect('/inicio');
    }
    return { erro: 'Usuário ou senha inválidos' };
  }

  // Login de filial — varre filiais ativas e tenta verify
  const filiais = await db.select().from(schema.filiais).where(eq(schema.filiais.ativa, true));
  for (const f of filiais) {
    if (await verifyPassword(f.senhaHash, senha)) {
      await createSession({ perfil: 'filial', filialId: f.id, lembrar });
      await db.insert(schema.logAcessos).values({
        usuario: `filial:${f.codigo}`, acao: 'login', ip,
        userAgent: h.get('user-agent') ?? null,
      });
      redirect('/inicio');
    }
  }
  return { erro: 'Senha inválida' };
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}
