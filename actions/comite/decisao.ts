'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import { nomeUsuario } from '@/lib/comite/acesso';
import { gestoresPorIds } from '@/lib/comite/gestores';
import { NOME_PARTICIPANTE_MAX, PARTICIPANTES_MAX, limparParticipantes } from '@/lib/comite/ata-util';
import { mesValido, type Decisao } from '@/lib/comite/tipos';

type Res<T = unknown> = ({ ok: true } & T) | { ok: false; erro: string };

const MOTIVO_MIN = 5;
const MOTIVO_MAX = 3000;

/** Só admin decide. Devolve a sessão ou um erro pronto para a tela. */
async function exigirAdmin() {
  const s = await requireSession();
  return s.perfil === 'admin' ? s : null;
}

/**
 * Aprova, não aprova (motivo obrigatório) ou volta o pedido para pendente (`decisao = null`).
 * Só admin pode decidir.
 */
export async function decidirLancamentoComite(
  id: string,
  decisao: Decisao | null,
  motivo?: string,
  gestorIds: string[] = [],
): Promise<Res> {
  try {
    const s = await exigirAdmin();
    if (!s) return { ok: false, erro: 'só o administrador pode aprovar ou não aprovar pedidos' };
    if (decisao !== null && decisao !== 'aprovado' && decisao !== 'nao_aprovado') return { ok: false, erro: 'decisão inválida' };

    // Quem decidiu: gestores regionais/nacionais escolhidos na tela (conferidos no QLP).
    let decididoPor: string | null = null;
    if (decisao !== null) {
      const gestores = await gestoresPorIds(Array.from(new Set(gestorIds)));
      if (gestores.length === 0) return { ok: false, erro: 'selecione quem decidiu (gestor regional ou nacional)' };
      decididoPor = gestores.map((g) => g.nome).join(', ');
    }

    const m = (motivo ?? '').trim();
    if (decisao === 'nao_aprovado') {
      if (m.length < MOTIVO_MIN) return { ok: false, erro: 'informe o motivo da não aprovação' };
      if (m.length > MOTIVO_MAX) return { ok: false, erro: `motivo longo demais (máx. ${MOTIVO_MAX} caracteres)` };
    }

    const [l] = await db
      .select({ id: schema.comiteDesligamentos.id })
      .from(schema.comiteDesligamentos)
      .where(eq(schema.comiteDesligamentos.id, id))
      .limit(1);
    if (!l) return { ok: false, erro: 'lançamento não encontrado' };

    await db
      .update(schema.comiteDesligamentos)
      .set(
        decisao === null
          ? { decisao: null, decisaoMotivo: null, decididoPor: null, decididoEm: null, updatedAt: new Date() }
          : {
              decisao,
              decisaoMotivo: decisao === 'nao_aprovado' ? m : null,
              decididoPor,
              decididoEm: new Date(),
              updatedAt: new Date(),
            },
      )
      .where(eq(schema.comiteDesligamentos.id, id));

    revalidatePath('/comite');
    revalidatePath('/comite/lancamentos');
    revalidatePath('/comite/ata');
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro ao salvar a decisão' };
  }
}

/** Salva a data do comitê e os participantes do mês (a ata). Só admin. */
export async function salvarAtaComite(i: { mes: string; dataComite: string | null; participantes: string[] }): Promise<Res> {
  try {
    const s = await exigirAdmin();
    if (!s) return { ok: false, erro: 'só o administrador pode editar a ata' };
    if (!mesValido(i.mes)) return { ok: false, erro: 'mês inválido' };
    if (i.dataComite !== null && !/^\d{4}-\d{2}-\d{2}$/.test(i.dataComite)) return { ok: false, erro: 'data do comitê inválida' };
    const participantes = limparParticipantes(i.participantes);
    if (participantes.length > PARTICIPANTES_MAX) return { ok: false, erro: `no máximo ${PARTICIPANTES_MAX} participantes` };
    if (participantes.some((p) => p.length > NOME_PARTICIPANTE_MAX)) {
      return { ok: false, erro: `nome longo demais (máx. ${NOME_PARTICIPANTE_MAX} caracteres)` };
    }

    const dia1 = `${i.mes}-01`;
    const valores = { dataComite: i.dataComite, participantes, atualizadoPor: nomeUsuario(s), updatedAt: new Date() };
    await db
      .insert(schema.comiteAtas)
      .values({ mesReferencia: dia1, ...valores })
      .onConflictDoUpdate({ target: schema.comiteAtas.mesReferencia, set: valores });

    revalidatePath('/comite/ata');
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro ao salvar a ata' };
  }
}
