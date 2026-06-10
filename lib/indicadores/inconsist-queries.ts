export type InconsistRowDb = {
  filialId: string | null;
  filialNome: string | null;
  filialCodigo: string | null;
  codfilialOrigem: string;
  chapa: string;
  nome: string;
  funcao: string | null;
  secao: string | null;
  regional: string | null;
  bandeira: string | null;
  tipo: string;
  dataOcorrencia: string | null;
};

export type ResumoInconsist = {
  colaboradores: number;
  totalInconsist: number;
  mediaPorPessoa: number;
};

export function agregarResumoInconsist(rows: InconsistRowDb[]): ResumoInconsist {
  const totalInconsist = rows.length;
  const colaboradores = new Set(rows.map((r) => r.chapa)).size;
  const mediaPorPessoa = colaboradores === 0 ? 0 : totalInconsist / colaboradores;
  return {
    colaboradores,
    totalInconsist,
    mediaPorPessoa: Math.round(mediaPorPessoa * 100) / 100,
  };
}

export function top5PorInconsist(
  rows: InconsistRowDb[], campo: 'funcao' | 'secao',
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

export type ResumoFilialInconsist = {
  filialId: string | null;
  filialNome: string | null;
  filialCodigo: string | null;
  qtdInconsist: number;
  qtdColaboradores: number;
};

export function agregarResumoPorFilialInconsist(rows: InconsistRowDb[]): ResumoFilialInconsist[] {
  const map = new Map<string, { nome: string | null; codigo: string | null; qtd: number; chapas: Set<string> }>();
  for (const r of rows) {
    const key = r.filialId ?? `__sem__:${r.filialCodigo ?? r.codfilialOrigem ?? ''}`;
    const cur = map.get(key) ?? { nome: r.filialNome, codigo: r.filialCodigo ?? r.codfilialOrigem, qtd: 0, chapas: new Set() };
    cur.qtd += 1;
    cur.chapas.add(r.chapa);
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([k, v]) => ({
      filialId: k.startsWith('__sem__') ? null : k,
      filialNome: v.nome,
      filialCodigo: v.codigo,
      qtdInconsist: v.qtd,
      qtdColaboradores: v.chapas.size,
    }))
    .sort((a, b) => b.qtdInconsist - a.qtdInconsist);
}

export type DetalhadoInconsistRow = {
  filialId: string | null;
  chapa: string;
  nome: string;
  funcao: string | null;
  secao: string | null;
  qtdInconsist: number;
  ocorrencias: Array<{ tipo: string; data: string | null }>;
};

export function montarDetalhadoInconsist(rows: InconsistRowDb[]): DetalhadoInconsistRow[] {
  const map = new Map<string, DetalhadoInconsistRow>();
  for (const r of rows) {
    const key = `${r.filialId ?? r.codfilialOrigem}|${r.chapa}`;
    const cur = map.get(key) ?? {
      filialId: r.filialId,
      chapa: r.chapa,
      nome: r.nome,
      funcao: r.funcao,
      secao: r.secao,
      qtdInconsist: 0,
      ocorrencias: [],
    };
    cur.qtdInconsist += 1;
    cur.ocorrencias.push({ tipo: r.tipo, data: r.dataOcorrencia });
    map.set(key, cur);
  }
  for (const v of map.values()) {
    v.ocorrencias.sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''));
  }
  return [...map.values()].sort((a, b) => b.qtdInconsist - a.qtdInconsist);
}
