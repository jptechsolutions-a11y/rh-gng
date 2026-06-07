'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, destroySession } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { loginSchema } from '@/lib/validators';

export type LoginState = { erro?: string } | undefined;

// Hash argon2id fixo (de senha aleatória descartada) usado para rodar UM verify
// em tempo ~constante quando o código de filial não existe — assim a latência não
// revela se um código é válido. Não corresponde a nenhuma senha real.
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=1$bJ5Znh+3ky5ydUTDH4e8IQ$vbEP6XD9+pucFaqqEG459kKqor6ocxrRpyyn+dbOnkU';

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    usuario: formData.get('usuario')?.toString(),
    filial: formData.get('filial')?.toString(),
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

  // Login de filial — O(1): busca pelo CÓDIGO informado e faz UM único verify.
  // (Antes: varria todas as filiais ativas rodando argon2 em cada uma → O(n).)
  const codigo = parsed.data.filial?.trim();
  if (!codigo) return { erro: 'Informe o código da filial' };

  const [f] = await db
    .select()
    .from(schema.filiais)
    .where(and(eq(schema.filiais.codigo, codigo), eq(schema.filiais.ativa, true)))
    .limit(1);

  if (f && (await verifyPassword(f.senhaHash, senha))) {
    await createSession({ perfil: 'filial', filialId: f.id, lembrar });
    await db.insert(schema.logAcessos).values({
      usuario: `filial:${f.codigo}`, acao: 'login', ip,
      userAgent: h.get('user-agent') ?? null,
    });
    redirect('/inicio');
  }

  // Código inexistente: roda 1 verify "dummy" para manter o tempo ~constante.
  if (!f) await verifyPassword(DUMMY_HASH, senha);
  return { erro: 'Filial ou senha inválidos' };
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}
