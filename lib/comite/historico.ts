import type { PedidoAnterior } from './tipos';

/** Pedido não aprovado de um colaborador, como vem do banco (qualquer mês). */
export type PedidoNaoAprovado = PedidoAnterior;

/**
 * Dos pedidos não aprovados de um colaborador, fica só o que veio ANTES do mês do pedido atual
 * (yyyy-mm), do mais recente para o mais antigo. O próprio mês e os posteriores não entram.
 */
export function pedidosAnteriores(mes: string, naoAprovados: ReadonlyArray<PedidoNaoAprovado>): PedidoAnterior[] {
  return naoAprovados
    .filter((p) => p.mes < mes)
    .sort((a, b) => (a.mes < b.mes ? 1 : a.mes > b.mes ? -1 : 0));
}

const dataBr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : null);

/** Texto curto do histórico, usado na ata em Word e em avisos: "Solicitado em 12/09/2026 (setembro/2026) — não aprovado: motivo". */
export function resumoPedidoAnterior(p: PedidoAnterior, nomeDoMes: (mes: string) => string): string {
  const quando = dataBr(p.solicitadoEm);
  const decidido = dataBr(p.decididoEm);
  return (
    `Solicitado ${quando ? `em ${quando} ` : ''}(comitê de ${nomeDoMes(p.mes)}) — ` +
    `não aprovado${decidido ? ` em ${decidido}` : ''}${p.decididoPor ? ` por ${p.decididoPor}` : ''}. ` +
    `Motivo da solicitação: ${p.justificativa} Motivo da não aprovação: ${p.motivoReprovacao}`
  );
}
