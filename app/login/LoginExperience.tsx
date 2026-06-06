'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ArrowRight } from 'lucide-react';
import { ConectaLogo } from '@/components/brand/ConectaLogo';
import { ConectaSymbol } from '@/components/brand/ConectaSymbol';
import {
  IconAcolher,
  IconOuvir,
  IconIdentificar,
  IconAgir,
} from '@/components/brand/ConectaPillarIcons';
import { LoginForm } from './LoginForm';

/**
 * Layout (espelho da capa Conecta+ G&G):
 *
 *  ┌────────────────────────────────┬│┬─────────────────────────────┐
 *  │ • blobs azul/laranja           │││  ┌─────────┐  Perlog        │
 *  │                                │││                              │
 *  │                                │││  ┌──────────────────────┐   │
 *  │      IMAGEM DA EQUIPE          │││  │ Projeto              │   │
 *  │      (full bleed esquerda)     │││  │ Conecta+ G&G         │   │
 *  │                                │││  │ GENTE E GESTÃO       │   │
 *  │                                │ │  │ Escuta que conecta…  │   │
 *  │                                │││  └──────────────────────┘   │
 *  │                                │││  ┌──────────────────────┐   │
 *  │                                │││  │ ACESSAR O SISTEMA →  │   │
 *  │                                │││  └──────────────────────┘   │
 *  ├────────────────────────────────┴│┴─────────────────────────────┤
 *  │  ACOLHER OUVIR IDENT. AGIR     │  │CONEXÃO QUE GERA VALOR — …  │
 *  └─────────────────────────────────┴─────────────────────────────┘
 *
 * • Linha vertical laranja com um "dash" branco no meio, alinhada com a divisão
 *   da barra inferior (azul → laranja).
 * • Conteúdo da direita ancorado À ESQUERDA da coluna direita (junto da barra).
 * • Login após clique mantém o mesmo enquadramento (mesma posição que o welcome).
 */
export function LoginExperience() {
  const [stage, setStage] = useState<'splash' | 'login'>('splash');
  const [animating, setAnimating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLDivElement>(null);
  const welcomeCtaRef = useRef<HTMLDivElement>(null);
  const loginRef = useRef<HTMLDivElement>(null);
  const teamARef = useRef<HTMLDivElement>(null);
  const teamBRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '#cg-symbol',
        { scale: 0.6, opacity: 0, rotation: -6 },
        {
          scale: 1, opacity: 1, rotation: 0,
          duration: 1.1, ease: 'elastic.out(1, 0.55)',
          delay: 0.15, clearProps: 'all',
        },
      );
      gsap.fromTo(
        '.cg-enter-stagger',
        { y: 26, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.7, stagger: 0.08,
          ease: 'power3.out', delay: 0.3, clearProps: 'all',
        },
      );
      // Anima apenas a opacidade do WRAPPER para não conflitar com o
      // translate-x do Tailwind aplicado ao <img>.
      gsap.fromTo(
        '#cg-team-a',
        { opacity: 0 },
        {
          opacity: 1, duration: 1.0,
          ease: 'power3.out', delay: 0.1, clearProps: 'opacity',
        },
      );
      gsap.fromTo(
        '.cg-pillar',
        { y: 16, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.07, duration: 0.5,
          ease: 'power2.out', delay: 0.6, clearProps: 'all',
        },
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const handleAccess = () => {
    if (animating || stage === 'login') return;
    setAnimating(true);

    const tl = gsap.timeline({
      onComplete: () => {
        setStage('login');
        setAnimating(false);
      },
    });

    tl.to([welcomeRef.current, welcomeCtaRef.current], {
      opacity: 0, x: 30, duration: 0.45, ease: 'power2.in',
    });

    // Anima a opacidade do wrapper (preservamos o translateY(-50%) inline)
    tl.to(
      teamARef.current,
      { opacity: 0, duration: 0.55, ease: 'power2.inOut' },
      '<',
    );
    // E aplica blur/scale no IMG interno, evitando conflito com o transform do wrapper
    tl.to(
      teamARef.current?.querySelector('img') as HTMLElement,
      { filter: 'blur(14px)', scale: 1.04, duration: 0.55, ease: 'power2.inOut' },
      '<',
    );
    tl.set(teamBRef.current, { opacity: 0 });
    tl.fromTo(
      teamBRef.current?.querySelector('img') as HTMLElement,
      { filter: 'blur(16px)', scale: 0.96 },
      { filter: 'blur(0px)', scale: 1, duration: 0.75, ease: 'power3.out' },
      '<0.2',
    );
    tl.to(
      teamBRef.current,
      { opacity: 1, duration: 0.6, ease: 'power2.out' },
      '<',
    );

    tl.fromTo(
      loginRef.current,
      { xPercent: 100, opacity: 0 },
      { xPercent: 0, opacity: 1, duration: 0.65, ease: 'expo.out' },
      '-=0.3',
    );
    tl.from(
      '.cg-form-item',
      { y: 28, opacity: 0, duration: 0.42, stagger: 0.075, ease: 'back.out(1.4)' },
      '-=0.35',
    );
  };

  // % de largura ocupada pela foto (define onde a barra inferior troca de cor
  // e onde a linha vertical laranja é desenhada).
  const SPLIT = 55;

  return (
    <div
      ref={rootRef}
      className="relative h-screen w-screen overflow-hidden bg-white text-conecta-text"
    >
      {/* ============== CAMADA FOTO (esquerda) ============== */}
      <div
        className="absolute left-0 top-0 bottom-12 z-0 pointer-events-none overflow-hidden"
        style={{ width: `${SPLIT}%` }}
        aria-hidden
      >
        {/* Blobs animados azul + laranja no canto superior esquerdo */}
        <div className="cg-blob cg-blob-navy absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full" />
        <div className="cg-blob cg-blob-orange absolute top-10 left-2 h-[280px] w-[280px] rounded-full" />
        <div className="cg-blob cg-blob-mid absolute top-44 left-32 h-[200px] w-[200px] rounded-full" />

        {/* Imagens em wrappers próprios para não conflitar com o transform do GSAP */}
        <div
          id="cg-team-a"
          ref={teamARef}
          className="cg-team-pulse absolute left-0 right-0"
          style={{ bottom: '0', transform: 'translateY(2%)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/conecta/equipe-1.png"
            alt=""
            className="w-[130%] h-auto max-w-none -translate-x-[23%]"
          />
        </div>
        <div
          id="cg-team-b"
          ref={teamBRef}
          className="cg-team-pulse absolute left-0 right-0 opacity-0"
          style={{ bottom: '0', transform: 'translateY(2%)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/conecta/equipe-2.png"
            alt=""
            className="w-[118%] h-auto max-w-none -translate-x-[8%]"
          />
        </div>
      </div>

      {/* ============== DIVISOR VERTICAL LARANJA ============== */}
      <OrangeDivider splitPct={SPLIT} />

      {/* ============== COLUNA DIREITA ============== */}
      <div
        className="absolute top-0 right-0 bottom-12 z-10 flex flex-col bg-white overflow-hidden"
        style={{ width: `${100 - SPLIT}%` }}
      >
        {/* Blobs decorativos azul + laranja (lado do texto) */}
        <div className="cg-blob cg-blob-orange-soft absolute -top-20 -right-24 h-[360px] w-[360px] rounded-full" />
        <div className="cg-blob cg-blob-navy-soft absolute top-1/3 -right-32 h-[300px] w-[300px] rounded-full" />
        <div className="cg-blob cg-blob-orange-mini absolute bottom-24 left-10 h-[220px] w-[220px] rounded-full" />

        {/* Topo: Perlog logo — alinhado à esquerda (mesma direção do texto) */}
        <div className="cg-enter-stagger relative z-10 flex justify-start pl-8 lg:pl-12 pt-8">
          <PerlogBrand />
        </div>

        {/* ① Welcome */}
        {stage === 'splash' && (
          <>
            <div
              ref={welcomeRef}
              className="relative z-10 flex-1 flex flex-col justify-center pl-8 lg:pl-12 pr-8 lg:pr-14 items-start text-left gap-2"
            >
              <ConectaSymbol id="cg-symbol" className="w-28 lg:w-32 self-start mb-1" />

              <p className="cg-enter-stagger font-display italic text-conecta-primary text-2xl">
                Projeto
              </p>

              <h1 className="cg-enter-stagger font-display font-extrabold tracking-tight leading-[0.92]">
                <span className="block text-[58px] lg:text-[72px]">
                  <span className="text-conecta-primary">Conecta</span>
                  <span className="text-conecta-accent">+</span>
                </span>
                <span className="block text-[58px] lg:text-[72px]">
                  <span className="text-conecta-primary">G</span>
                  <span className="text-conecta-accent">&amp;</span>
                  <span className="text-conecta-primary">G</span>
                </span>
              </h1>

              <div className="cg-enter-stagger flex items-center gap-3 mt-1">
                <span className="h-[3px] w-10 bg-conecta-accent" />
                <span className="font-display font-semibold tracking-[0.32em] text-conecta-primary text-sm">
                  GENTE E GESTÃO
                </span>
                <span className="h-[3px] w-10 bg-conecta-accent" />
              </div>

              <div className="cg-enter-stagger mt-5 flex items-stretch gap-3 max-w-md">
                <span className="block w-[3px] rounded bg-conecta-primary" />
                <p className="text-conecta-primary text-[19px] lg:text-[21px] leading-snug font-display font-medium">
                  Escuta que conecta.
                  <br />
                  Diálogo que transforma.
                  <br />
                  Juntos, construímos uma{' '}
                  <strong className="font-extrabold">Perlog</strong> cada{' '}
                  <strong className="font-extrabold text-conecta-accent">vez melhor.</strong>
                </p>
              </div>
            </div>

            <div
              ref={welcomeCtaRef}
              className="cg-enter-stagger relative z-10 pl-8 lg:pl-12 pr-8 lg:pr-14 pb-8"
            >
              <button
                type="button"
                onClick={handleAccess}
                className="conecta-btn-access text-base w-full justify-center"
              >
                ACESSAR O SISTEMA
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </>
        )}

        {/* ② Login — mesmo enquadramento do welcome */}
        {stage === 'login' && (
          <>
            <div
              ref={loginRef}
              className="relative z-10 flex-1 flex flex-col justify-center pl-8 lg:pl-12 pr-8 lg:pr-14 items-start text-left"
            >
              <h2 className="cg-form-item font-display text-[40px] lg:text-[52px] font-extrabold text-conecta-primary leading-[0.95] tracking-tight">
                <span className="block">Bem-vindo</span>
                <span className="block text-conecta-accent">de volta</span>
              </h2>
              <p className="cg-form-item mt-3 font-display text-conecta-muted text-[16px] lg:text-[17px] max-w-md">
                Acesse o sistema Conecta G&amp;G — Gente &amp; Gestão Perlog.
              </p>

              <div className="cg-form-item mt-7 w-full max-w-md">
                <LoginForm />
              </div>
            </div>

            {/* Rodapé reto, fixo no rodapé do painel */}
            <div className="cg-form-item relative z-10 pl-8 lg:pl-12 pr-8 lg:pr-14 pb-4 text-[10px] leading-snug text-conecta-muted/80 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="uppercase tracking-[0.2em] text-conecta-muted">
                Conecta G&amp;G · Perlog · v2.0
              </span>
              <span className="opacity-50">·</span>
              <span>
                Desenvolvido por{' '}
                <span className="font-semibold text-conecta-primary">Juliano Patrick</span>
              </span>
            </div>
          </>
        )}
      </div>

      {/* ============== BARRA INFERIOR — reta, dividida no SPLIT ============== */}
      <FooterBar splitPct={SPLIT} />
    </div>
  );
}

/* ====================== Subcomponentes ====================== */

function OrangeDivider({ splitPct }: { splitPct: number }) {
  return (
    <div
      className="absolute top-0 bottom-12 z-30 pointer-events-none"
      style={{ left: `calc(${splitPct}% - 1.5px)`, width: '3px' }}
      aria-hidden
    >
      <div className="relative h-full w-full">
        {/* Trecho superior */}
        <div
          className="absolute left-0 right-0 top-0"
          style={{ height: 'calc(50% - 24px)', background: '#E8621A' }}
        />
        {/* Dash branco no meio */}
        <div
          className="absolute left-0 right-0"
          style={{ top: 'calc(50% - 24px)', height: '48px', background: '#FFFFFF' }}
        />
        {/* Trecho inferior */}
        <div
          className="absolute left-0 right-0 bottom-0"
          style={{ height: 'calc(50% - 24px)', background: '#E8621A' }}
        />
      </div>
    </div>
  );
}

function PerlogBrand() {
  const [logoOk, setLogoOk] = useState(true);
  return (
    <div className="relative h-10 w-[160px] flex items-center justify-start">
      {logoOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/perlog-logo.png"
          alt=""
          className="h-full w-auto object-contain object-left"
          onError={() => setLogoOk(false)}
        />
      ) : (
        <span className="inline-flex items-center gap-1 select-none">
          <span className="inline-block h-6 w-[3px] bg-conecta-accent skew-x-[-22deg]" />
          <span className="inline-block h-6 w-[3px] bg-conecta-primary skew-x-[-22deg]" />
          <span className="font-display font-extrabold text-[26px] text-conecta-primary tracking-tight">
            Perlog
          </span>
        </span>
      )}
    </div>
  );
}

function FooterBar({ splitPct }: { splitPct: number }) {
  const pillars = [
    { Icon: IconAcolher, title: 'ACOLHER', sub: 'para integrar' },
    { Icon: IconOuvir, title: 'OUVIR', sub: 'para entender' },
    { Icon: IconIdentificar, title: 'IDENTIFICAR', sub: 'para evoluir' },
    { Icon: IconAgir, title: 'AGIR', sub: 'para transformar' },
  ];
  return (
    <div className="absolute bottom-0 left-0 right-0 h-12 z-20 flex font-display">
      {/* Faixa azul (esquerda) com pilares */}
      <div
        className="bg-conecta-primary flex items-center justify-around px-3 gap-1 text-white overflow-hidden"
        style={{ width: `${splitPct}%` }}
      >
        {pillars.map(({ Icon, title, sub }) => (
          <div key={title} className="cg-pillar flex items-center gap-1.5 min-w-0">
            <span className="grid place-items-center h-6 w-6 rounded-full border border-white/55 text-white/90 shrink-0">
              <Icon className="h-3 w-3" />
            </span>
            <div className="leading-none min-w-0">
              <div className="text-[10px] font-semibold tracking-[0.14em] whitespace-nowrap">
                {title}
              </div>
              <div className="text-[8px] text-conecta-accentLight tracking-wide mt-0.5 whitespace-nowrap">
                {sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Faixa laranja (direita) — reta */}
      <div
        className="bg-conecta-accent text-white pl-6 pr-6 flex items-center"
        style={{ width: `${100 - splitPct}%` }}
      >
        <div className="leading-tight">
          <div className="text-[10px] uppercase tracking-[0.22em] opacity-90">
            Conexão que gera valor
          </div>
          <div className="text-[12px] font-extrabold uppercase tracking-[0.16em]">
            Pessoas que movem a nossa jornada
          </div>
        </div>
      </div>
    </div>
  );
}
