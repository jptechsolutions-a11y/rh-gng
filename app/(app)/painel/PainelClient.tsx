'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { Badge, statusVariant } from '@/components/ui/badge';

type Row = {
  id: string;
  nome: string;
  cpf: string;
  cargoPretendido: string | null;
  status: string;
  decisaoEm: Date | string | null;
  gestorAprovador: string | null;
  dataHora: Date | string;
};

function retornoDe(status: string) {
  if (status === 'Aprovado') return 'Aprovado';
  if (status === 'Reprovado') return 'Reprovado';
  return 'Pendente';
}

function maskCpf(cpf: string) {
  const d = cpf.replace(/\D/g, '');
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}
function fmt(d: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}

export function PainelRecentesBusca({ entrevistas }: { entrevistas: Row[] }) {
  const [q, setQ] = useState('');
  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return entrevistas.slice(0, 8);
    const digits = term.replace(/\D/g, '');
    return entrevistas.filter((e) =>
      e.nome.toLowerCase().includes(term) ||
      (digits.length >= 3 && e.cpf.includes(digits)) ||
      (e.cargoPretendido ?? '').toLowerCase().includes(term)
    ).slice(0, 30);
  }, [q, entrevistas]);

  return (
    <>
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-perlog-slate" />
        <input
          type="text"
          placeholder="Buscar por nome, CPF ou cargo…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-8 pr-8 h-9 w-full rounded-md border border-slate-200 bg-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perlog-orange/60"
        />
        {q && (
          <button type="button" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-perlog-slate hover:text-perlog-navy">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {filtradas.length === 0 ? (
        <div className="p-12 text-center text-perlog-slate">
          <p className="font-medium text-perlog-navy">Nenhum resultado para &ldquo;{q}&rdquo;</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-perlog-slate">
              <th className="px-6 py-3 font-medium">Candidato</th>
              <th className="px-6 py-3 font-medium">Cargo proposto</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Retorno</th>
              <th className="px-6 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((e) => {
              const ret = retornoDe(e.status);
              return (
                <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-3">
                    <Link href={`/entrevista/${e.id}`} className="font-medium text-perlog-navy hover:text-perlog-orange">{e.nome}</Link>
                    <div className="text-xs text-perlog-slate">{maskCpf(e.cpf)}</div>
                  </td>
                  <td className="px-6 py-3 text-perlog-slate">{e.cargoPretendido ?? '—'}</td>
                  <td className="px-6 py-3"><Badge variant={statusVariant(e.status)}>{e.status}</Badge></td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      ret === 'Aprovado' ? 'bg-emerald-100 text-emerald-800' :
                      ret === 'Reprovado' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>{ret}</span>
                    {(e.status === 'Aprovado' || e.status === 'Reprovado') && e.decisaoEm && (
                      <div className="text-[11px] text-perlog-slate mt-0.5">
                        {e.status} por {e.gestorAprovador ?? '—'} em {fmt(e.decisaoEm)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3 text-perlog-slate">{fmt(e.dataHora)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}

/**
 * Gráfico de área + barras (SVG nativo, sem dependência).
 * - Eixo Y com linhas de grade
 * - Gradient de área sob a curva
 * - Tooltip nativo via <title>
 * - Linha de média
 * - Datas no eixo X
 */
export function WeeklyChart({ data }: { data: Array<{ label: string; value: number; date?: string }> }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  // Arredonda max para o próximo múltiplo de 5 (eixo Y mais limpo)
  const yMax = Math.max(5, Math.ceil(max / 5) * 5);
  const totalPeriodo = data.reduce((a, b) => a + b.value, 0);
  const media = (totalPeriodo / data.length).toFixed(1);

  const W = 560, H = 220;
  const padL = 30, padR = 12, padT = 16, padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const step = innerW / Math.max(1, data.length - 1);
  const bw = Math.max(8, step * 0.55);

  const pts = data.map((d, i) => ({
    x: padL + i * step,
    y: padT + innerH - (d.value / yMax) * innerH,
    v: d.value,
    label: d.label,
    date: d.date,
  }));

  const linhaPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = pts.length
    ? `M ${pts[0]!.x} ${padT + innerH} ${pts.map((p) => `L ${p.x} ${p.y}`).join(' ')} L ${pts[pts.length - 1]!.x} ${padT + innerH} Z`
    : '';
  const yLinhas = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    y: padT + innerH - p * innerH,
    label: Math.round(p * yMax),
  }));
  const mediaY = padT + innerH - (Number(media) / yMax) * innerH;

  return (
    <div className="w-full">
      <div className="flex items-end justify-between mb-2">
        <div>
          <p className="text-xs text-perlog-slate">Total no período</p>
          <p className="text-2xl font-bold text-perlog-navy tabular-nums">{totalPeriodo}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-perlog-slate">Média semanal</p>
          <p className="text-sm font-semibold text-perlog-orange tabular-nums">{media}</p>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Entrevistas por semana">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F37021" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#F37021" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grade horizontal */}
        {yLinhas.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={g.y} x2={W - padR} y2={g.y} stroke="#E2E8F0" strokeDasharray={i === yLinhas.length - 1 ? '0' : '2,3'} />
            <text x={padL - 6} y={g.y + 3} textAnchor="end" className="fill-perlog-slate" style={{ fontSize: 9 }}>{g.label}</text>
          </g>
        ))}

        {/* Linha de média */}
        {Number(media) > 0 && (
          <g>
            <line x1={padL} y1={mediaY} x2={W - padR} y2={mediaY} stroke="#F37021" strokeDasharray="4,3" strokeOpacity={0.55} />
            <text x={W - padR - 4} y={mediaY - 4} textAnchor="end" className="fill-perlog-orange" style={{ fontSize: 9, fontWeight: 600 }}>
              média {media}
            </text>
          </g>
        )}

        {/* Área */}
        <path d={areaPath} fill="url(#areaGrad)" />
        {/* Linha */}
        <path d={linhaPath} fill="none" stroke="#F37021" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Barras finas atrás dos pontos */}
        {pts.map((p, i) => (
          <rect
            key={`b-${i}`}
            x={p.x - bw / 2}
            y={p.y}
            width={bw}
            height={padT + innerH - p.y}
            fill="#F37021"
            fillOpacity={0.08}
            rx={2}
          />
        ))}

        {/* Pontos + label de valor + tooltip nativo */}
        {pts.map((p, i) => (
          <g key={`p-${i}`}>
            <circle cx={p.x} cy={p.y} r={4} fill="white" stroke="#F37021" strokeWidth={2}>
              <title>{`${p.label}${p.date ? ` (${p.date})` : ''}: ${p.v} entrevista${p.v === 1 ? '' : 's'}`}</title>
            </circle>
            {p.v > 0 && (
              <text x={p.x} y={p.y - 8} textAnchor="middle" className="fill-perlog-navy" style={{ fontSize: 10, fontWeight: 600 }}>
                {p.v}
              </text>
            )}
            {/* Label do eixo X */}
            <text x={p.x} y={H - padB + 14} textAnchor="middle" className="fill-perlog-slate" style={{ fontSize: 10 }}>
              {p.label}
            </text>
            {p.date && (
              <text x={p.x} y={H - padB + 26} textAnchor="middle" className="fill-perlog-slate/60" style={{ fontSize: 8 }}>
                {p.date}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
