'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Lock, Search, UserRound } from 'lucide-react';
import { ConectaCard } from '@/components/ui/conecta-card';
import {
  buscarColaboradorPesquisa,
  enviarRespostaPesquisa,
  type ColaboradorPesquisa,
} from '@/actions/pesquisas/publico';
import type { Valor } from '@/lib/pesquisas/tipos';

interface Pergunta {
  id: string;
  texto: string;
  tipo: 'unica' | 'multipla' | 'texto' | 'nota';
  obrigatoria: boolean;
  opcoes: string[];
}

export function PesquisaPublica({
  slug,
  titulo,
  descricao,
  anonima,
  encerrada,
  filiais,
  perguntas,
}: {
  slug: string;
  titulo: string;
  descricao: string | null;
  anonima: boolean;
  encerrada: boolean;
  filiais: { id: string; codigo: string; nome: string; restante: number }[];
  perguntas: Pergunta[];
}) {
  const [chapa, setChapa] = useState('');
  const [colab, setColab] = useState<ColaboradorPesquisa | null>(null);
  const [filialId, setFilialId] = useState('');
  const [respostas, setRespostas] = useState<Record<string, Valor | null>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);
  const [pending, start] = useTransition();

  if (encerrada) {
    return (
      <ConectaCard>
        <h1 className="font-display text-xl font-extrabold text-conecta-primary">{titulo}</h1>
        <p className="mt-3 text-sm text-conecta-muted">Esta pesquisa foi encerrada e não está mais aceitando respostas.</p>
      </ConectaCard>
    );
  }

  if (enviada) {
    return (
      <ConectaCard>
        <div className="py-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-3 font-display text-xl font-extrabold text-conecta-primary">Resposta enviada!</h1>
          <p className="mt-1 text-sm text-conecta-muted">Obrigado por participar.</p>
        </div>
      </ConectaCard>
    );
  }

  function buscar() {
    setErro(null);
    start(async () => {
      const r = await buscarColaboradorPesquisa(slug, chapa);
      if (r.ok) setColab(r.colaborador);
      else setErro(r.erro);
    });
  }

  function enviar() {
    setErro(null);
    start(async () => {
      const r = await enviarRespostaPesquisa(slug, {
        chapa: colab?.chapa,
        filialId: anonima ? filialId : undefined,
        respostas,
      });
      if (r.ok) setEnviada(true);
      else setErro(r.erro);
    });
  }

  const liberado = anonima ? !!filialId : !!colab;
  const set = (id: string, v: Valor | null) => setRespostas((r) => ({ ...r, [id]: v }));
  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base';

  return (
    <div className="space-y-4">
      <ConectaCard>
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-xl font-extrabold text-conecta-primary leading-tight">{titulo}</h1>
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 text-[10px] font-display font-semibold uppercase tracking-wide">
            {anonima ? <Lock className="h-3 w-3" /> : <UserRound className="h-3 w-3" />}
            {anonima ? 'Anônima' : 'Identificada'}
          </span>
        </div>
        {descricao && <p className="mt-2 text-sm text-conecta-muted">{descricao}</p>}
      </ConectaCard>

      {/* Identificação */}
      {!anonima ? (
        <ConectaCard>
          <label className="block text-[11px] font-display font-semibold uppercase tracking-wide text-conecta-muted">
            Sua matrícula
          </label>
          {colab ? (
            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <div className="font-display font-bold text-conecta-primary">{colab.nome}</div>
              <div className="text-conecta-muted">{colab.funcao}{colab.secao ? ` · ${colab.secao}` : ''}</div>
              <div className="text-conecta-muted">Filial {colab.filialCodigo} · Matrícula {colab.chapa}</div>
              <button
                type="button"
                onClick={() => { setColab(null); setErro(null); }}
                className="mt-2 text-[11px] font-display font-semibold text-conecta-accent hover:underline"
              >
                Não sou eu / trocar matrícula
              </button>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <input
                value={chapa}
                onChange={(e) => setChapa(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && chapa.trim() && buscar()}
                inputMode="numeric"
                placeholder="Digite sua matrícula"
                className={inputCls}
              />
              <button
                type="button"
                disabled={pending || !chapa.trim()}
                onClick={buscar}
                className="inline-flex items-center gap-1.5 rounded-lg bg-conecta-primary text-white px-4 text-sm font-display font-semibold disabled:opacity-50"
              >
                <Search className="h-4 w-4" /> Buscar
              </button>
            </div>
          )}
        </ConectaCard>
      ) : (
        <ConectaCard>
          <label className="block text-[11px] font-display font-semibold uppercase tracking-wide text-conecta-muted">
            Sua filial
          </label>
          <select value={filialId} onChange={(e) => setFilialId(e.target.value)} className={`mt-2 ${inputCls}`}>
            <option value="">Selecione…</option>
            {filiais.map((f) => (
              <option key={f.id} value={f.id} disabled={f.restante <= 0}>
                {f.codigo} — {f.nome}{f.restante <= 0 ? ' (respostas completas)' : ''}
              </option>
            ))}
          </select>
          <p className="mt-2 text-[11px] text-conecta-muted">Sua resposta é anônima — apenas a filial é registrada.</p>
        </ConectaCard>
      )}

      {/* Perguntas */}
      {liberado && (
        <>
          {perguntas.map((q, i) => {
            const v = respostas[q.id];
            return (
              <ConectaCard key={q.id}>
                <div className="font-display text-[15px] font-bold text-conecta-primary">
                  {i + 1}. {q.texto}
                  {q.obrigatoria && <span className="text-conecta-accent"> *</span>}
                </div>
                <div className="mt-3 space-y-2">
                  {q.tipo === 'unica' &&
                    q.opcoes.map((o) => (
                      <label key={o} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer text-[15px] ${v === o ? 'border-conecta-accent bg-conecta-accent/8' : 'border-slate-200'}`}>
                        <input type="radio" name={q.id} checked={v === o} onChange={() => set(q.id, o)} className="h-4 w-4 accent-[#E8621A]" />
                        {o}
                      </label>
                    ))}
                  {q.tipo === 'multipla' &&
                    q.opcoes.map((o) => {
                      const sel = Array.isArray(v) && v.includes(o);
                      return (
                        <label key={o} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer text-[15px] ${sel ? 'border-conecta-accent bg-conecta-accent/8' : 'border-slate-200'}`}>
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() => {
                              const atual = Array.isArray(v) ? v : [];
                              set(q.id, sel ? atual.filter((x) => x !== o) : [...atual, o]);
                            }}
                            className="h-4 w-4 accent-[#E8621A]"
                          />
                          {o}
                        </label>
                      );
                    })}
                  {q.tipo === 'nota' && (
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => set(q.id, n)}
                          className={`h-12 flex-1 rounded-lg border font-display font-bold text-lg ${v === n ? 'border-conecta-accent bg-conecta-accent text-white' : 'border-slate-200 text-conecta-primary'}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  )}
                  {q.tipo === 'texto' && (
                    <textarea
                      rows={3}
                      value={typeof v === 'string' ? v : ''}
                      onChange={(e) => set(q.id, e.target.value)}
                      className={inputCls}
                    />
                  )}
                </div>
              </ConectaCard>
            );
          })}

          {erro && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-3 text-sm">{erro}</div>}

          <button
            type="button"
            disabled={pending}
            onClick={enviar}
            className="w-full rounded-lg bg-conecta-accent text-white py-3 text-sm font-display font-bold uppercase tracking-[0.14em] hover:brightness-110 disabled:opacity-60"
          >
            {pending ? 'Enviando…' : 'Enviar resposta'}
          </button>
        </>
      )}

      {!liberado && erro && <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-900 p-3 text-sm">{erro}</div>}
    </div>
  );
}
