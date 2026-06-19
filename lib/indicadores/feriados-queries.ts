export type FeriadosRowDb = {
  filialId: string | null;
  filialNome: string | null;
  filialCodigo: string | null;
  codfilialOrigem: string;
  chapa: string;
  nome: string;
  funcao: string | null;
  secao: string | null;
  codsecao: string | null;
  regional: string | null;
  bandeira: string | null;
  pendencia: string | null;
  dataFeriado: string | null;
  valor: number;
  dsr: number;
  encargos: number;
  total: number;
};

export type ResumoFeriados = {
  colaboradores: number;
  totalPendencias: number;
  valorTotal: number;
  mediaPorPessoa: number;
};

function round2(n: number) { return Math.round(n * 100) / 100; }

export function agregarResumoFeriados(rows: FeriadosRowDb[]): ResumoFeriados {
  const totalPendencias = rows.length;
  const colaboradores = new Set(rows.map((r) => r.chapa)).size;
  const valorTotal = rows.reduce((a, r) => a + (r.total || 0), 0);
  const mediaPorPessoa = colaboradores === 0 ? 0 : totalPendencias / colaboradores;
  return {
    colaboradores,
    totalPendencias,
    valorTotal: round2(valorTotal),
    mediaPorPessoa: round2(mediaPorPessoa),
  };
}

export function top5PorFeriados(
  rows: FeriadosRowDb[],
  campo: 'funcao' | 'secao' | 'pendencia',
): Array<{ label: string; valor: number; pct: number }> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = (r[campo] ?? '').trim();
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const total = rows.length || 1;
  return [...map.entries()]
    .map(([label, valor]) => ({
      label, valor,
      pct: Math.round((valor / total) * 1000) / 10,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);
}

export type ResumoFilialFeriados = {
  filialId: string | null;
  filialNome: string | null;
  filialCodigo: string | null;
  qtdPendencias: number;
  qtdColaboradores: number;
  valorTotal: number;
};

export function agregarResumoPorFilialFeriados(rows: FeriadosRowDb[]): ResumoFilialFeriados[] {
  const map = new Map<string, { nome: string | null; codigo: string | null; qtd: number; chapas: Set<string>; valor: number }>();
  for (const r of rows) {
    const key = r.filialId ?? `__sem__:${r.filialCodigo ?? r.codfilialOrigem ?? ''}`;
    const cur = map.get(key) ?? {
      nome: r.filialNome,
      codigo: r.filialCodigo ?? r.codfilialOrigem,
      qtd: 0,
      chapas: new Set<string>(),
      valor: 0,
    };
    cur.qtd += 1;
    cur.chapas.add(r.chapa);
    cur.valor += r.total || 0;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([k, v]) => ({
      filialId: k.startsWith('__sem__') ? null : k,
      filialNome: v.nome,
      filialCodigo: v.codigo,
      qtdPendencias: v.qtd,
      qtdColaboradores: v.chapas.size,
      valorTotal: round2(v.valor),
    }))
    .sort((a, b) => b.qtdPendencias - a.qtdPendencias);
}

export type DetalhadoFeriadosRow = {
  filialId: string | null;
  chapa: string;
  nome: string;
  funcao: string | null;
  secao: string | null;
  qtdPendencias: number;
  valorTotal: number;
  ocorrencias: Array<{ pendencia: string | null; data: string | null; total: number }>;
};

export function montarDetalhadoFeriados(rows: FeriadosRowDb[]): DetalhadoFeriadosRow[] {
  const map = new Map<string, DetalhadoFeriadosRow>();
  for (const r of rows) {
    const key = `${r.filialId ?? r.codfilialOrigem}|${r.chapa}`;
    const cur = map.get(key) ?? {
      filialId: r.filialId,
      chapa: r.chapa,
      nome: r.nome,
      funcao: r.funcao,
      secao: r.secao,
      qtdPendencias: 0,
      valorTotal: 0,
      ocorrencias: [],
    };
    cur.qtdPendencias += 1;
    cur.valorTotal += r.total || 0;
    cur.ocorrencias.push({ pendencia: r.pendencia, data: r.dataFeriado, total: r.total });
    map.set(key, cur);
  }
  for (const v of map.values()) {
    v.valorTotal = round2(v.valorTotal);
    v.ocorrencias.sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''));
  }
  return [...map.values()].sort((a, b) => b.qtdPendencias - a.qtdPendencias);
}
