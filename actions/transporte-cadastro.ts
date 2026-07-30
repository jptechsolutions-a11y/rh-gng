'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, sql } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession, type Session } from '@/lib/auth/session';
import { hasModuleAccess } from '@/lib/modules/permissions';
import { parseCadastroPassageiros } from '@/lib/transporte/cadastro-xls-parser';

async function requireTransporte(): Promise<Session> {
  const s = await requireSession();
  if (!(await hasModuleAccess(s, 'transporte'))) throw new Error('FORBIDDEN');
  return s;
}

function getFilialId(s: Session, filialIdParam?: string): string {
  if (s.perfil === 'admin') {
    if (!filialIdParam) throw new Error('filialId obrigatório para admin');
    return filialIdParam;
  }
  if (s.perfil !== 'filial') throw new Error('FORBIDDEN');
  return s.filialId;
}

export async function importarCadastro(formData: FormData, filialIdParam?: string) {
  const s = await requireTransporte();
  const filialId = getFilialId(s, filialIdParam);

  const arquivo = formData.get('arquivo');
  if (!(arquivo instanceof File)) throw new Error('Arquivo não enviado');
  const buf = Buffer.from(await arquivo.arrayBuffer());
  const linhas = parseCadastroPassageiros(buf);
  if (linhas.length === 0) throw new Error('Nenhuma linha válida encontrada na planilha');

  for (const l of linhas) {
    await db.execute(sql`
      INSERT INTO transporte_cadastro (filial_id, chapa, nome, rua, bairro, cidade, telefone1, telefone2, situacao, updated_at)
      VALUES (${filialId}, ${l.chapa}, ${l.nome}, ${l.rua}, ${l.bairro}, ${l.cidade}, ${l.telefone1}, ${l.telefone2}, ${l.situacao}, now())
      ON CONFLICT (filial_id, chapa)
      DO UPDATE SET nome = ${l.nome}, rua = ${l.rua}, bairro = ${l.bairro}, cidade = ${l.cidade},
        telefone1 = ${l.telefone1}, telefone2 = ${l.telefone2}, situacao = ${l.situacao}, updated_at = now()
    `);
  }

  revalidatePath('/transporte/informacoes');
  return { total: linhas.length };
}

export async function listarInformacoesPassageiros(filialIdParam?: string) {
  const s = await requireTransporte();
  const filialId = getFilialId(s, filialIdParam);

  const rows = await db
    .select({
      id: schema.transportePassageiros.id,
      nome: schema.transportePassageiros.nome,
      chapa: schema.transportePassageiros.chapa,
      rotaId: schema.transportePassageiros.rotaId,
      rotaNome: schema.transporteRotas.nome,
      rotaTurno: schema.transporteRotas.turno,
      rotaLugares: schema.transporteRotas.lugares,
      rua: schema.transporteCadastro.rua,
      bairro: schema.transporteCadastro.bairro,
      cidade: schema.transporteCadastro.cidade,
      telefone1: schema.transporteCadastro.telefone1,
      telefone2: schema.transporteCadastro.telefone2,
      situacao: schema.transporteCadastro.situacao,
    })
    .from(schema.transportePassageiros)
    .leftJoin(schema.transporteRotas, eq(schema.transporteRotas.id, schema.transportePassageiros.rotaId))
    .leftJoin(
      schema.transporteCadastro,
      and(
        eq(schema.transporteCadastro.filialId, schema.transportePassageiros.filialId),
        eq(schema.transporteCadastro.chapa, schema.transportePassageiros.chapa),
      ),
    )
    .where(and(
      eq(schema.transportePassageiros.filialId, filialId),
      eq(schema.transportePassageiros.ativo, true),
    ))
    .orderBy(schema.transportePassageiros.nome);

  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    chapa: r.chapa,
    rotaNome: r.rotaNome,
    rotaTurno: r.rotaTurno,
    veiculo: r.rotaLugares != null ? `Van ${r.rotaLugares} lugares` : null,
    endereco: [r.rua, r.bairro, r.cidade].filter(Boolean).join(' - ') || null,
    telefone1: r.telefone1,
    telefone2: r.telefone2,
    situacao: r.situacao,
  }));
}
