'use client';

import { useEffect, useMemo, useState } from 'react';
import { Cloud, X, Calendar, Building2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  contarOcorrencias,
  normalizar,
  textoContemPalavra,
  type PalavraContagem,
} from '@/lib/escuta/nuvem';

export type PercepcaoItem = {
  id: string;
  filialCodigo: string;
  filialNome: string | null;
  dataReuniao: string;
  texto: string;
};

type FilialOpt = { codigo: string; nome: string };

type Props = {
  percepcoes: PercepcaoItem[];
  filiais: FilialOpt[];
  ehAdmin: boolean;
};

const TOP_N = 50;

function formatarData(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Embaralha as palavras top mantendo as maiores ao centro do layout flex.
// Estrategia: ordena por valor desc, depois alterna esquerda/direita para
// puxar as gigantes pro meio.
function organizarLayout(palavras: PalavraContagem[]): PalavraContagem[] {
  const ord = [...palavras];
  const esq: PalavraContagem[] = [];
  const dir: PalavraContagem[] = [];
  ord.forEach((p, i) => (i % 2 === 0 ? esq.push(p) : dir.push(p)));
  return [...esq.reverse(), ...dir];
}

function destacarPalavra(texto: string, palavraNorm: string): React.ReactNode {
  if (!palavraNorm) return texto;
  const partes: React.ReactNode[] = [];
  // Trabalha sobre o texto original mantendo a posicao, comparando contra
  // a versao normalizada para preservar acentos no destaque.
  const textoNorm = normalizar(texto);
  const re = new RegExp(`\\b${palavraNorm}\\b`, 'g');
  let idx = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(textoNorm)) !== null) {
    const start = m.index;
    const end = start + m[0].length;
    if (start > idx) partes.push(texto.slice(idx, start));
    partes.push(
      <mark
        key={key++}
        className="rounded bg-[#FFB81C]/40 px-0.5 font-semibold text-conecta-dark"
      >
        {texto.slice(start, end)}
      </mark>,
    );
    idx = end;
  }
  if (idx < texto.length) partes.push(texto.slice(idx));
  return partes;
}

export function NuvemPercepcoes({ percepcoes, filiais, ehAdmin }: Props) {
  const [filtroFilial, setFiltroFilial] = useState<string>('');
  const [palavraAtiva, setPalavraAtiva] = useState<string | null>(null);

  const filtradas = useMemo(() => {
    if (!ehAdmin || !filtroFilial) return percepcoes;
    return percepcoes.filter((p) => p.filialCodigo === filtroFilial);
  }, [percepcoes, filtroFilial, ehAdmin]);

  const contagens = useMemo(
    () => contarOcorrencias(filtradas.map((p) => p.texto), TOP_N),
    [filtradas],
  );

  const layout = useMemo(() => organizarLayout(contagens), [contagens]);

  const { min, max } = useMemo(() => {
    if (contagens.length === 0) return { min: 0, max: 0 };
    return {
      min: contagens[contagens.length - 1]!.value,
      max: contagens[0]!.value,
    };
  }, [contagens]);

  // Re-tocar animacao quando filtro muda.
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [filtroFilial]);

  const ocorrencias = useMemo(() => {
    if (!palavraAtiva) return [];
    return filtradas.filter((p) => textoContemPalavra(p.texto, palavraAtiva));
  }, [palavraAtiva, filtradas]);

  function escalaTamanho(v: number): number {
    if (max === min) return 36;
    const t = (v - min) / (max - min);
    return Math.round(16 + t * 56); // 16px -> 72px
  }

  function escalaCor(v: number): string {
    if (max === min) return 'hsl(214, 88%, 35%)';
    const t = (v - min) / (max - min);
    const L = Math.round(65 - t * 40); // 65% -> 25%
    return `hsl(214, 88%, ${L}%)`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-conecta-dark">
          <Cloud className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Nuvem de palavras · Percepção G&amp;G</h2>
        </div>

        {ehAdmin && (
          <div className="flex items-center gap-2">
            <label htmlFor="filtro-filial" className="text-sm text-slate-600">
              Filial:
            </label>
            <select
              id="filtro-filial"
              value={filtroFilial}
              onChange={(e) => setFiltroFilial(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-conecta-primary focus:outline-none focus:ring-1 focus:ring-conecta-primary"
            >
              <option value="">Todas as filiais</option>
              {filiais.map((f) => (
                <option key={f.codigo} value={f.codigo}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/60 p-6 shadow-sm">
        {contagens.length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center text-slate-500">
            {percepcoes.length === 0
              ? 'Nenhuma percepção registrada ainda.'
              : 'Esta filial ainda não tem percepções.'}
          </div>
        ) : (
          <div
            key={animKey}
            className="nuvem-wrap flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-6"
          >
            {layout.map((p, i) => (
              <button
                key={p.text}
                type="button"
                onClick={() => setPalavraAtiva(p.text)}
                style={{
                  fontSize: `${escalaTamanho(p.value)}px`,
                  color: escalaCor(p.value),
                  animationDelay: `${i * 18}ms`,
                  lineHeight: 1.05,
                }}
                className={cn(
                  'nuvem-palavra cursor-pointer rounded-md px-1 font-display font-semibold',
                  'transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:scale-110',
                  'focus:outline-none focus:ring-2 focus:ring-conecta-primary/40',
                )}
                title={`${p.text} · ${p.value} ocorrência${p.value > 1 ? 's' : ''}`}
              >
                {p.text}
              </button>
            ))}
          </div>
        )}

        {contagens.length > 0 && (
          <div className="mt-2 text-center text-xs text-slate-500">
            {filtradas.length} percepç{filtradas.length === 1 ? 'ão' : 'ões'} ·
            {' '}top {contagens.length} palavras · clique para explorar
          </div>
        )}
      </div>

      {palavraAtiva !== null && (
        <PainelPalavra
          palavra={palavraAtiva}
          ocorrencias={ocorrencias}
          mostrarFilial={ehAdmin && !filtroFilial}
          onClose={() => setPalavraAtiva(null)}
        />
      )}
    </div>
  );
}

function PainelPalavra({
  palavra,
  ocorrencias,
  mostrarFilial,
  onClose,
}: {
  palavra: string;
  ocorrencias: PercepcaoItem[];
  mostrarFilial: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="flex-1 bg-slate-900/40 backdrop-blur-sm animate-in fade-in"
      />
      <aside className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl animate-in slide-in-from-right">
        <header className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Palavra selecionada
            </div>
            <div className="mt-1 text-2xl font-semibold text-conecta-dark">
              {palavra}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {ocorrencias.length} percepç{ocorrencias.length === 1 ? 'ão' : 'ões'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {ocorrencias.length === 0 ? (
            <div className="text-slate-500">Nenhuma percepção corresponde.</div>
          ) : (
            <ul className="space-y-4">
              {ocorrencias.map((o) => (
                <li
                  key={o.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-slate-600 ring-1 ring-slate-200">
                      <Calendar className="h-3 w-3" />
                      {formatarData(o.dataReuniao)}
                    </span>
                    {mostrarFilial && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-conecta-primary/10 px-2 py-0.5 font-medium text-conecta-dark ring-1 ring-conecta-primary/20">
                        <Building2 className="h-3 w-3" />
                        {o.filialNome ?? o.filialCodigo}
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                    {destacarPalavra(o.texto, palavra)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
