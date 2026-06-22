'use client';

import { useState, useTransition } from 'react';
import { reclassificarFuncao } from '@/actions/qlp/cargos';

const TIERS = ['gerente', 'subgerente', 'coord', 'supervisor', 'base'] as const;
const NIVEIS = ['', 'nacional', 'regional', 'i', 'ii'] as const;
const TRILHAS = [
  'logistica',
  'transporte',
  'abastecimento',
  'prevencao',
  'gg',
  'manutencao',
  'ti',
  'financ',
  'outros',
] as const;

export interface CargoRow {
  funcao: string;
  tier: string;
  nivel: string | null;
  trilha: string | null;
  confirmada_por_admin: boolean;
  qtd: number;
}

export function CargoEditor({ rows }: { rows: CargoRow[] }) {
  const [pending, start] = useTransition();
  const [local, setLocal] = useState<CargoRow[]>(rows);
  const [savingFor, setSavingFor] = useState<string | null>(null);

  function save(i: number, patch: Partial<CargoRow>) {
    const cur = local[i];
    if (!cur) return;
    const next: CargoRow = { ...cur, ...patch, confirmada_por_admin: true };
    setLocal((arr) => arr.map((x, idx) => (idx === i ? next : x)));
    setSavingFor(next.funcao);
    start(async () => {
      try {
        await reclassificarFuncao({
          funcao: next.funcao,
          tier: next.tier,
          nivel: next.nivel,
          trilha: next.trilha,
        });
      } finally {
        setSavingFor(null);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr className="border-b border-slate-200">
            <th className="text-left p-3 font-medium text-slate-600">Função</th>
            <th className="text-left p-3 font-medium text-slate-600">Tier</th>
            <th className="text-left p-3 font-medium text-slate-600">Nível</th>
            <th className="text-left p-3 font-medium text-slate-600">Trilha</th>
            <th className="text-center p-3 font-medium text-slate-600">Confirmada</th>
            <th className="text-right p-3 font-medium text-slate-600">Qtd</th>
          </tr>
        </thead>
        <tbody>
          {local.map((r, i) => (
            <tr key={r.funcao} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="p-3 text-slate-900">{r.funcao}</td>
              <td className="p-3">
                <select
                  value={r.tier}
                  onChange={(e) => save(i, { tier: e.target.value })}
                  className="rounded border border-slate-300 px-2 py-1"
                  disabled={pending && savingFor === r.funcao}
                >
                  {TIERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </td>
              <td className="p-3">
                <select
                  value={r.nivel ?? ''}
                  onChange={(e) => save(i, { nivel: e.target.value || null })}
                  className="rounded border border-slate-300 px-2 py-1"
                  disabled={pending && savingFor === r.funcao}
                >
                  {NIVEIS.map((n) => (
                    <option key={n} value={n}>
                      {n || '—'}
                    </option>
                  ))}
                </select>
              </td>
              <td className="p-3">
                <select
                  value={r.trilha ?? 'outros'}
                  onChange={(e) => save(i, { trilha: e.target.value })}
                  className="rounded border border-slate-300 px-2 py-1"
                  disabled={pending && savingFor === r.funcao}
                >
                  {TRILHAS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </td>
              <td className="p-3 text-center">
                {r.confirmada_por_admin ? (
                  <span className="inline-block rounded-full bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5">
                    ✓
                  </span>
                ) : (
                  <span className="inline-block rounded-full bg-slate-100 text-slate-500 text-xs px-2 py-0.5">
                    auto
                  </span>
                )}
              </td>
              <td className="p-3 text-right text-slate-700 tabular-nums">{r.qtd}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
