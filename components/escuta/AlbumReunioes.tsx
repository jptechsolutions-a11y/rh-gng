'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, GalleryHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';

export type AlbumItem = {
  id: string;
  filialCodigo: string;
  filialNome: string | null;
  turma: string;
  dataReuniao: string;
  fotoUrl: string;
  fotoIndex?: number;
  fotoTotal?: number;
};

const AUTOPLAY_MS = 5500;
const FLIP_MS = 700;

export function AlbumReunioes({ itens }: { itens: AlbumItem[] }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [flipDir, setFlipDir] = useState<null | 'next' | 'prev'>(null);
  const hoverRef = useRef(false);
  const total = itens.length;

  const go = useCallback((dir: 'next' | 'prev') => {
    if (total <= 1 || flipDir) return;
    setFlipDir(dir);
    window.setTimeout(() => {
      setIdx((i) => dir === 'next' ? (i + 1) % total : (i - 1 + total) % total);
      setFlipDir(null);
    }, FLIP_MS);
  }, [total, flipDir]);

  useEffect(() => {
    if (!playing || total <= 1) return;
    const tick = window.setInterval(() => {
      if (!hoverRef.current && !document.hidden) go('next');
    }, AUTOPLAY_MS);
    return () => window.clearInterval(tick);
  }, [playing, total, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go('next');
      else if (e.key === 'ArrowLeft') go('prev');
      else if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-conecta-primary/20 bg-conecta-light/40 p-12 text-center">
        <GalleryHorizontal className="h-8 w-8 mx-auto text-conecta-muted/60" />
        <p className="mt-3 text-sm text-conecta-muted">
          Nenhuma reunião registrada nas últimas 3 semanas.
        </p>
      </div>
    );
  }

  const atual = itens[idx]!;
  const proximo = itens[(idx + 1) % total]!;
  const anterior = itens[(idx - 1 + total) % total]!;
  // Polaroids de fundo extras — só aparecem quando há acervo suficiente.
  // Usam fotos diferentes para evitar duplicar a foto atual ao lado dela.
  const farLeft  = total > 3 ? itens[(idx - 2 + total) % total]! : null;
  const farRight = total > 3 ? itens[(idx + 2) % total]! : null;
  const topLeft     = total > 5 ? itens[(idx - 3 + total) % total]! : null;
  const topRight    = total > 5 ? itens[(idx + 3) % total]! : null;
  const bottomLeft  = total > 7 ? itens[(idx - 4 + total) % total]! : null;
  const bottomRight = total > 7 ? itens[(idx + 4) % total]! : null;

  return (
    <div
      className="space-y-5"
      onMouseEnter={() => { hoverRef.current = true; }}
      onMouseLeave={() => { hoverRef.current = false; }}
    >
      {/* Cabeçalho editorial */}
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-conecta-accent">
            <span className="h-[2px] w-8 bg-conecta-accent" />
            <span className="font-display text-[10px] uppercase tracking-[0.28em] font-semibold">
              Álbum Escuta G&amp;G
            </span>
          </div>
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-conecta-primary mt-1.5 leading-tight">
            Reuniões<span className="text-conecta-accent">.</span>
          </h2>
          <p className="text-xs text-conecta-muted mt-1">
            Últimas 3 semanas · todas as filiais
          </p>
        </div>
        <div className="text-right" aria-live="polite">
          <div className="font-display text-4xl font-bold text-conecta-primary tabular-nums leading-none">
            {String(idx + 1).padStart(2, '0')}
            <span className="text-conecta-muted/40 text-2xl"> / {String(total).padStart(2, '0')}</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-conecta-muted mt-1">
            registros
          </div>
        </div>
      </header>

      {/* Palco — mesa de álbum */}
      <div className="album-stage relative rounded-[28px] overflow-hidden border border-conecta-primary/10 shadow-elev">
        {/* Fundo: gradiente navy + textura granulada */}
        <div className="absolute inset-0 album-bg" aria-hidden />
        <div className="absolute inset-0 album-grain pointer-events-none" aria-hidden />
        {/* Spotlight orgânico */}
        <div className="absolute inset-0 album-spot pointer-events-none" aria-hidden />

        <div className="relative px-4 sm:px-8 py-10 sm:py-14">
          <div
            className="relative mx-auto"
            style={{ perspective: '1800px', width: 'min(100%, 560px)', height: 'min(72vh, 620px)' }}
          >
            {/* Pilhas de fundo mais distantes (renderizadas primeiro = atrás) */}
            {bottomLeft  && <Polaroid item={bottomLeft}  variant="behind-bottom-left"  key={`bl-${bottomLeft.id}`} />}
            {bottomRight && <Polaroid item={bottomRight} variant="behind-bottom-right" key={`br-${bottomRight.id}`} />}
            {topLeft     && <Polaroid item={topLeft}     variant="behind-top-left"     key={`tl-${topLeft.id}`} />}
            {topRight    && <Polaroid item={topRight}    variant="behind-top-right"    key={`tr-${topRight.id}`} />}
            {farLeft     && <Polaroid item={farLeft}     variant="behind-far-left"     key={`fl-${farLeft.id}`} />}
            {farRight    && <Polaroid item={farRight}    variant="behind-far-right"    key={`fr-${farRight.id}`} />}
            {total > 1 && (
              <>
                {/* Polaroid trás-direita (próximo) */}
                <Polaroid
                  item={proximo}
                  variant="behind-right"
                  key={`b-${proximo.id}`}
                />
                {/* Polaroid trás-esquerda (anterior) */}
                <Polaroid
                  item={anterior}
                  variant="behind-left"
                  key={`l-${anterior.id}`}
                />
              </>
            )}
            {/* Polaroid principal */}
            <Polaroid
              item={atual}
              variant={flipDir === 'next' ? 'flying-out-next' : flipDir === 'prev' ? 'flying-out-prev' : 'top'}
              key={`t-${atual.id}-${flipDir ?? 'still'}`}
              kenBurns
            />
          </div>
        </div>

        {/* Setas */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go('prev')}
              aria-label="Reunião anterior"
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/95 backdrop-blur border border-white/40 shadow-card text-conecta-primary hover:text-conecta-accent hover:scale-105 active:scale-95 flex items-center justify-center transition-all z-20"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => go('next')}
              aria-label="Próxima reunião"
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/95 backdrop-blur border border-white/40 shadow-card text-conecta-primary hover:text-conecta-accent hover:scale-105 active:scale-95 flex items-center justify-center transition-all z-20"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Controles + timeline */}
      {total > 1 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-conecta-primary/15 text-xs font-semibold text-conecta-primary hover:border-conecta-accent/40 hover:text-conecta-accent transition shadow-card"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? 'Pausar' : 'Reproduzir'}
          </button>

          <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0">
            {itens.map((_, i) => {
              const dist = Math.abs(i - idx);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`Ir para reunião ${i + 1}`}
                  className={cn(
                    'rounded-full transition-all',
                    i === idx
                      ? 'h-2 w-8 bg-conecta-accent'
                      : dist <= 2
                        ? 'h-1.5 w-1.5 bg-conecta-primary/30 hover:bg-conecta-primary/60'
                        : 'h-1 w-1 bg-conecta-primary/20 hover:bg-conecta-primary/40',
                  )}
                />
              );
            })}
          </div>

          <div className="text-[10px] uppercase tracking-[0.22em] text-conecta-muted text-right">
            ← →  navegar<br />espaço  pausar
          </div>
        </div>
      )}
    </div>
  );
}

function Polaroid({
  item, variant, kenBurns = false,
}: {
  item: AlbumItem;
  variant:
    | 'top'
    | 'behind-left' | 'behind-right'
    | 'behind-far-left' | 'behind-far-right'
    | 'behind-top-left' | 'behind-top-right'
    | 'behind-bottom-left' | 'behind-bottom-right'
    | 'flying-out-next' | 'flying-out-prev';
  kenBurns?: boolean;
}) {
  const data = new Date(item.dataReuniao);
  const dataFmt = data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const filial = item.filialNome ?? item.filialCodigo;

  const baseClass = 'absolute inset-0 m-auto rounded-md bg-white shadow-[0_24px_60px_-15px_rgba(7,24,64,0.45),0_8px_20px_-6px_rgba(7,24,64,0.35)] border border-black/5 select-none';
  const variantClass = {
    top: 'album-polaroid-top z-10',
    'behind-left': 'album-polaroid-left z-[1] opacity-90 pointer-events-none',
    'behind-right': 'album-polaroid-right z-[1] opacity-90 pointer-events-none',
    'behind-far-left': 'album-polaroid-far-left z-0 pointer-events-none',
    'behind-far-right': 'album-polaroid-far-right z-0 pointer-events-none',
    'behind-top-left': 'album-polaroid-top-left z-0 pointer-events-none',
    'behind-top-right': 'album-polaroid-top-right z-0 pointer-events-none',
    'behind-bottom-left': 'album-polaroid-bottom-left z-0 pointer-events-none',
    'behind-bottom-right': 'album-polaroid-bottom-right z-0 pointer-events-none',
    'flying-out-next': 'album-polaroid-fly-next z-10',
    'flying-out-prev': 'album-polaroid-fly-prev z-10',
  }[variant];

  return (
    <div
      className={cn(baseClass, variantClass)}
      style={{ width: '88%', height: '94%' }}
      aria-hidden={variant !== 'top'}
    >
      {/* Fita adesiva no topo (decoração) */}
      <span
        aria-hidden
        className="absolute -top-2 left-1/2 -translate-x-1/2 h-5 w-20 bg-conecta-accent/35 rotate-[-2deg] rounded-sm shadow-sm"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0 4px, transparent 4px 8px)' }}
      />

      {/* Foto */}
      <div className="absolute inset-3 bottom-[88px] overflow-hidden rounded-sm bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.fotoUrl}
          alt={`Reunião ${filial} · ${dataFmt}`}
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            kenBurns && 'album-kenburns',
          )}
          draggable={false}
        />
        {/* vinheta sutil */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{ background: 'radial-gradient(circle at center, transparent 55%, rgba(0,0,0,0.35) 100%)' }}
        />
      </div>

      {/* Caption */}
      <div className="absolute left-0 right-0 bottom-0 h-[88px] px-5 flex flex-col justify-center">
        <div className="text-[10px] uppercase tracking-[0.26em] font-semibold text-conecta-accent flex items-center gap-2">
          <span>Filial {item.filialCodigo}</span>
          {item.fotoTotal && item.fotoTotal > 1 && item.fotoIndex && (
            <span className="text-conecta-muted/70 normal-case tracking-normal text-[10px]">
              · foto {item.fotoIndex}/{item.fotoTotal}
            </span>
          )}
        </div>
        <div className="font-display text-lg sm:text-xl font-bold text-conecta-primary leading-tight truncate mt-0.5">
          {filial}
        </div>
        <div className="font-display text-sm text-conecta-muted mt-0.5 tracking-wide">
          {dataFmt}
        </div>
      </div>
    </div>
  );
}
