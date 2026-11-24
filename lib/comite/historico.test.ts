import { describe, it, expect } from 'vitest';
import { pedidosAnteriores, resumoPedidoAnterior } from './historico';
import type { PedidoAnterior } from './tipos';

const pedido = (mes: string, extra: Partial<PedidoAnterior> = {}): PedidoAnterior => ({
  id: mes,
  mes,
  solicitadoEm: `${mes}-12T15:00:00.000Z`,
  solicitadoPor: 'Filial 713',
  justificativa: 'Faltas frequentes.',
  motivoReprovacao: 'Dar nova chance.',
  decididoPor: 'Admin',
  decididoEm: `${mes}-20T15:00:00.000Z`,
  ...extra,
});

describe('pedidosAnteriores', () => {
  const todos = [pedido('2026-08'), pedido('2026-10'), pedido('2026-09'), pedido('2026-11')];
  it('fica só com meses anteriores ao do pedido, do mais recente ao mais antigo', () => {
    expect(pedidosAnteriores('2026-11', todos).map((p) => p.mes)).toEqual(['2026-10', '2026-09', '2026-08']);
  });
  it('o próprio mês não entra', () => {
    expect(pedidosAnteriores('2026-08', todos)).toEqual([]);
  });
  it('não altera a lista original', () => {
    const copia = [...todos];
    pedidosAnteriores('2026-12', todos);
    expect(todos).toEqual(copia);
  });
});

describe('resumoPedidoAnterior', () => {
  it('monta o texto com quem decidiu e os dois motivos', () => {
    const t = resumoPedidoAnterior(pedido('2026-09'), (m) => `mês ${m}`);
    expect(t).toContain('Solicitado em 12/09/2026');
    expect(t).toContain('comitê de mês 2026-09');
    expect(t).toContain('não aprovado em 20/09/2026 por Admin');
    expect(t).toContain('Motivo da solicitação: Faltas frequentes.');
    expect(t).toContain('Motivo da não aprovação: Dar nova chance.');
  });
  it('funciona sem data nem decisor', () => {
    const t = resumoPedidoAnterior(pedido('2026-09', { decididoEm: null, decididoPor: null }), (m) => m);
    expect(t).toContain('não aprovado.');
  });
});
