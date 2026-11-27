import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import type { ColaboradorComite } from '@/lib/comite/tipos';
import { candidatosChapa } from '@/lib/pesquisas/tipos';
import { normalizarCodigoFilial } from '@/lib/vagas/normalizar-codigo-filial';

/** Acha o colaborador ativo no QLP e confere se ele é da filial escolhida (e se a sessão pode usar essa filial). */
export async function resolverColaborador(
  filialCodigo: string,
  chapaDigitada: string,
  permitidas: { codigo: string }[],
): Promise<{ ok: true; c: ColaboradorComite } | { ok: false; erro: string }> {
  const filial = normalizarCodigoFilial(filialCodigo);
  if (!permitidas.some((f) => f.codigo === filial)) return { ok: false, erro: 'você não tem acesso a essa filial' };
  const cands = candidatosChapa(chapaDigitada);
  if (cands.length === 0) return { ok: false, erro: 'informe a matrícula' };
  const [r] = await db
    .select({
      chapa: schema.qlpColaboradores.chapa,
      nome: schema.qlpColaboradores.nome,
      funcao: schema.qlpColaboradores.funcao,
      secao: schema.qlpColaboradores.secao,
      codfilial: schema.qlpColaboradores.codfilial,
      admissao: schema.qlpColaboradores.dtAdmissao,
      idade: schema.qlpColaboradores.idade,
      horario: schema.qlpColaboradores.horario,
    })
    .from(schema.qlpColaboradores)
    .where(and(inArray(schema.qlpColaboradores.chapa, cands), eq(schema.qlpColaboradores.ativo, true)))
    .limit(1);
  if (!r) return { ok: false, erro: 'matrícula não encontrada entre os colaboradores ativos (QLP)' };
  const dele = normalizarCodigoFilial(String(r.codfilial));
  if (dele !== filial) return { ok: false, erro: `essa matrícula pertence à filial ${dele}, não à ${filial}` };
  return { ok: true, c: { chapa: r.chapa, nome: r.nome, funcao: r.funcao, secao: r.secao, filialCodigo: dele, admissao: r.admissao, idade: r.idade, horario: r.horario } };
}
