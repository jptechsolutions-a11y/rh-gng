'use client';

import { useEffect, useMemo, useState } from 'react';
import { Flag, Trophy } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';

export type MetricaIc = 'total' | 'pct';

export interface Raia {
  chave: string;   // identifica a raia (filial ou responsável)
  titulo: string;  // texto principal (ex.: "Filial 264")
  sub: string;     // texto secundário (ex.: responsável / filiais)
  cor: string;
  imagem: string | null; // imagem própria do responsável (opcional)
  uf: string | null;     // UF da filial → escolhe o cavalo com a bandeira do estado
  pend: number;
  quadro: number;             // funcionários cadastrados (denominador do %)
  posAnterior: number | null; // posição na semana anterior
}

const MEDALHA = ['🥇', '🥈', '🥉'];
const UFS = new Set(['sc', 'sp', 'rs', 'mt', 'ms', 'df']);

type Estado = 'correndo' | 'comemorando' | 'desanimado';
const ESTADO_LABEL: Record<Estado, string> = { correndo: 'correndo', comemorando: 'chegou!', desanimado: 'desanimado — muitas pendências' };

/** Cavalo da bandeira do estado no pose certo; sem UF conhecida cai na imagem do responsável ou no emoji. */
function spriteDe(uf: string | null, estado: Estado, imagem: string | null): string | null {
  const k = uf?.toLowerCase() ?? '';
  if (UFS.has(k)) return `/ic/cavalos/${k}-${estado}.png`;
  return imagem;
}

/** % de pendências sobre o quadro: é isso (e não o total bruto) que decide a posição na corrida. */
export function pctQuadro(pend: number, quadro: number) {
  if (quadro > 0) return (pend / quadro) * 100;
  return pend > 0 ? 100 : 0;
}

const fmtPct = (p: number) => `${p < 10 && p > 0 ? p.toFixed(1).replace('.', ',') : Math.round(p)}%`;

function mediana(v: number[]) {
  if (v.length === 0) return 0;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/**
 * Corrida dos responsáveis: quem tem MENOS pendências está mais perto da linha de
 * chegada. A raia é clicável (filtra o dashboard) e os cavalos "correm" até a
 * posição ao carregar/trocar de semana ou filtro.
 */
export function IcCorrida({
  raias,
  selecionado,
  onSelect,
  semanaLabel,
  metrica,
}: {
  metrica: MetricaIc;
  raias: Raia[];
  selecionado: string | null;
  onSelect: (nome: string) => void;
  semanaLabel: string;
}) {
  // Ordena por pendências (menos = melhor); empate divide a posição.
  const ordenadas = useMemo(() => {
    // Posição pela métrica escolhida: total de pendências ou % sobre o quadro (menor = melhor).
    const arr = raias
      .map((r) => { const pct = pctQuadro(r.pend, r.quadro); return { ...r, pct, valor: metrica === 'pct' ? pct : r.pend }; })
      .sort((a, b) => a.valor - b.valor || a.pend - b.pend || a.titulo.localeCompare(b.titulo, undefined, { numeric: true }));
    let pos = 0;
    return arr.map((r, i) => {
      if (i === 0 || Math.abs(r.valor - arr[i - 1]!.valor) > 1e-9) pos = i + 1;
      return { ...r, pos };
    });
  }, [raias, metrica]);

  const max = Math.max(1e-6, ...ordenadas.map((r) => r.valor));
  // "Desanimado" = muito atrás do pelotão: pelo menos o dobro da mediana do % das raias (e ao menos 10% do quadro).
  const limiteCansado = Math.max(metrica === 'pct' ? 10 : 30, 2 * mediana(ordenadas.map((r) => r.valor)));
  // 0 pendência = linha de chegada (100%); a pior raia fica perto da largada (6%).
  const progresso = (valor: number) => 6 + (1 - valor / max) * 88;

  // Anima da largada até a posição: renderiza em 0 e, no frame seguinte, vai para o alvo.
  const chave = metrica + '|' + ordenadas.map((r) => `${r.chave}:${r.pend}:${r.quadro}`).join('|');
  const [largou, setLargou] = useState(false);
  useEffect(() => {
    setLargou(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setLargou(true)));
    return () => cancelAnimationFrame(id);
  }, [chave]);

  return (
    <ConectaCard noPadding>
      <style>{`
        @keyframes ic-galope { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-5px) rotate(-3deg); } }
        @keyframes ic-poeira { 0% { opacity: .55; transform: translateX(0) scale(.6); } 100% { opacity: 0; transform: translateX(-26px) scale(1.4); } }
        @keyframes ic-chegou { 0%,100% { transform: translateY(0) scale(1); } 40% { transform: translateY(-9px) scale(1.12); } 60% { transform: translateY(0) scale(.96); } }
        @keyframes ic-brilho { 0%,100% { box-shadow: 0 0 0 0 rgba(22,163,74,.55); } 50% { box-shadow: 0 0 0 10px rgba(22,163,74,0); } }
        @keyframes ic-confete { 0% { opacity: 0; transform: translate(0,0) rotate(0deg) scale(.4); } 15% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(260deg) scale(1); } }
        @keyframes ic-cansado { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(2px) rotate(1.2deg); } }
        .ic-cansado { animation: ic-cansado 1.8s ease-in-out infinite; }
        .ic-cavalo { animation: ic-galope .45s ease-in-out infinite; }
        .ic-chegou { animation: ic-chegou 1.1s ease-in-out infinite; }
        .ic-brilho { animation: ic-brilho 1.4s ease-out infinite; }
        .ic-confete { animation: ic-confete 1.6s ease-out infinite; }
        .ic-poeira { animation: ic-poeira .7s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) { .ic-cavalo, .ic-poeira, .ic-chegou, .ic-brilho, .ic-confete, .ic-cansado { animation: none; } }
      `}</style>
      <div className="p-5 pb-3">
        <SectionHeader
          label={`Corrida de regularização · ${semanaLabel}`}
          icon={Trophy}
          action={<span className="hidden sm:inline text-[11px] text-conecta-muted">Menos pendências (no total ou no % do quadro) = mais perto da chegada · clique numa raia para filtrar</span>}
        />
      </div>

      <div className="px-3 sm:px-5 pb-5 space-y-2">
        {ordenadas.map((r, i) => {
          const ativo = selecionado === r.chave;
          const zerou = r.pend === 0; // regularizou tudo: chegou!
          const estado: Estado = zerou ? 'comemorando' : r.valor >= limiteCansado ? 'desanimado' : 'correndo';
          const sprite = spriteDe(r.uf, estado, r.imagem);
          const dim = selecionado != null && !ativo;
          const left = largou ? (zerou ? 97 : progresso(r.valor)) : 2;
          const delta = r.posAnterior != null ? r.posAnterior - r.pos : 0; // positivo = subiu
          const cor = zerou ? '#16A34A' : r.cor;
          return (
            <button
              key={r.chave}
              type="button"
              onClick={() => onSelect(r.chave)}
              aria-pressed={ativo}
              title={`${r.titulo} — ${r.sub} · ${r.pend} pendências ÷ quadro ${r.quadro} = ${fmtPct(r.pct)} · ${ESTADO_LABEL[estado]}`}
              className={`group flex w-full items-stretch gap-3 rounded-xl text-left transition ${dim ? 'opacity-45' : ''} ${ativo ? 'ring-2 ring-conecta-accent/70 ring-offset-2' : ''}`}
            >
              {/* Placar */}
              <div className="w-44 sm:w-60 shrink-0 flex items-center gap-2 py-1">
                <span className="w-8 text-center text-xl leading-none">{r.pos <= 3 ? MEDALHA[r.pos - 1] : <span className="font-display text-sm font-bold text-conecta-muted">{r.pos}º</span>}</span>
                <div className="min-w-0">
                  <div className="font-display text-[13px] font-bold leading-tight text-conecta-primary truncate">{r.titulo}</div>
                  <div className="text-[10px] text-conecta-muted truncate">{r.sub}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-display text-lg font-extrabold tabular-nums" style={{ color: cor }}>{metrica === 'pct' ? fmtPct(r.pct) : r.pend}</span>
                    <span className="text-[10px] text-conecta-muted tabular-nums">
                      {metrica === 'pct' ? `${r.pend} pend. · quadro ${r.quadro}` : `pendências · ${fmtPct(r.pct)} do quadro`}
                    </span>
                    {zerou && (
                      <span className="rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 px-1.5 py-px text-[9px] font-display font-bold uppercase tracking-wide">
                        ✔ Chegou!
                      </span>
                    )}
                    {r.posAnterior != null && delta !== 0 && (
                      <span className={`text-[10px] font-display font-bold ${delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {delta > 0 ? `▲${delta}` : `▼${-delta}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pista */}
              <div
                className="relative flex-1 min-h-[92px] rounded-xl overflow-hidden"
                style={{
                  background: zerou
                    ? 'linear-gradient(180deg,#E9F9EF,#CDF0DA)'
                    : i % 2 === 0 ? 'linear-gradient(180deg,#EEF2FB,#E3EAF8)' : 'linear-gradient(180deg,#FFF4EC,#FDE8D8)',
                  boxShadow: zerou ? 'inset 0 0 0 1px rgba(22,163,74,0.35)' : 'inset 0 0 0 1px rgba(13,43,107,0.08)',
                }}
              >
                {/* marcação da pista */}
                <span aria-hidden className="absolute inset-x-0 top-1/2 h-px" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(13,43,107,.25) 0 14px, transparent 14px 28px)' }} />
                {/* chegada quadriculada */}
                <span
                  aria-hidden
                  className="absolute right-0 inset-y-0 w-4"
                  style={{ backgroundImage: 'repeating-conic-gradient(#0D2B6B 0% 25%, #fff 0% 50%)', backgroundSize: '8px 8px' }}
                />
                <Flag aria-hidden className="absolute right-6 top-1 h-3.5 w-3.5 text-conecta-accent" />
                {/* rastro do cavalo */}
                <span
                  aria-hidden
                  className="absolute inset-y-[34px] left-0 rounded-r-full"
                  style={{
                    width: `${left}%`,
                    background: `linear-gradient(90deg, transparent, ${cor}${zerou ? '55' : '33'})`,
                    transition: `width 1.6s cubic-bezier(.2,.8,.2,1) ${i * 90}ms`,
                  }}
                />
                {/* cavalo */}
                <div
                  className="absolute top-1/2 -translate-y-1/2"
                  style={{
                    left: `${left}%`,
                    transform: 'translate(-100%, -50%)',
                    transition: `left 1.6s cubic-bezier(.2,.8,.2,1) ${i * 90}ms`,
                  }}
                >
                  <div
                    className={`relative ${estado === 'comemorando' ? 'ic-chegou' : estado === 'desanimado' ? 'ic-cansado' : 'ic-cavalo'}`}
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    {sprite ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sprite}
                        alt={`${r.titulo} — ${ESTADO_LABEL[estado]}`}
                        draggable={false}
                        className="h-[78px] w-auto max-w-[140px] object-contain drop-shadow-md select-none"
                      />
                    ) : (
                      <span
                        className={`grid h-12 w-12 place-items-center rounded-full text-[28px] leading-none text-white shadow ${zerou ? 'ic-brilho' : ''}`}
                        style={{ background: cor }}
                      >
                        <span style={{ display: 'inline-block', transform: 'scaleX(-1)' }}>🏇</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
        {ordenadas.length === 0 && <p className="py-8 text-center text-sm text-conecta-muted">Sem dados para a corrida.</p>}
      </div>
    </ConectaCard>
  );
}
