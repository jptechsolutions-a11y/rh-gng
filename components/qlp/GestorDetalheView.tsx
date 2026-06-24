'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Users, Network, History,
  IdCard, AlertTriangle, Clock, GraduationCap, CalendarDays,
  LayoutDashboard, List,
} from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { SubTabs } from '@/app/(app)/indicadores/_shared/SubTabs';
import { TimeDistribuicaoCard } from './TimeDistribuicaoCard';
import { MeuTimeTable, type TimeColab } from './MeuTimeTable';

interface ColabInfo {
  nome: string;
  chapa: string;
  funcao: string;
  secao: string | null;
  ativo: boolean;
  filialLabel: string;
  filialNome: string | null;
  tierResolvido: string | null;
  nivelResolvido: string | null;
}

interface CadeiaItem {
  nivel: number;
  tier: string;
  nome: string;
  funcao: string;
  colaboradorId: string;
}

interface HistoricoItem {
  id: string;
  evento: string;
  atorNome: string;
  atorTipo: string;
  createdAt: string;
}

interface OcorrenciasResumo {
  inconsistencias: number;
  bhHoras: number;
  bhValor: number;
  bhColaboradores: number;
  cursosPendentes: number;
  feriadosPendentes: number;
  feriadosValor: number;
  totalTime: number;
  comOcorrencia: number;
}

interface Props {
  colab: ColabInfo;
  ehLiderAtivo: boolean;
  ocorrenciasResumo: OcorrenciasResumo | null;
  time: TimeColab[];
  cadeia: CadeiaItem[];
  historico: HistoricoItem[];
  isAdmin: boolean;
}

type Aba = 'principal' | 'detalhado';

export function GestorDetalheView({
  colab, ehLiderAtivo, ocorrenciasResumo, time, cadeia, historico, isAdmin,
}: Props) {
  const [aba, setAba] = useState<Aba>('principal');

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <Link
        href="/qlp/gestores"
        className="inline-flex items-center gap-1 text-[11px] font-display font-semibold uppercase tracking-[0.18em] text-conecta-muted hover:text-conecta-accent transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Voltar aos gestores
      </Link>

      {/* ===== Cartão do líder/colaborador ===== */}
      <ConectaCard variant={ehLiderAtivo ? 'orange' : 'navy'}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-[2px] w-6 bg-conecta-accent" />
              <span className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-accent font-semibold">
                {ehLiderAtivo ? 'Líder do time' : 'Colaborador'}
              </span>
            </div>
            <h1 className="font-display text-2xl lg:text-[28px] font-extrabold text-conecta-primary leading-tight tracking-tight">
              {colab.nome}
            </h1>
            <div className="mt-1 flex items-center flex-wrap gap-2 text-[12px] text-conecta-muted">
              <span className="font-mono text-conecta-primary/80">{colab.chapa}</span>
              <span className="text-conecta-muted/40">·</span>
              <span>{colab.funcao}</span>
              {!colab.ativo && (
                <span className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] font-display font-bold">
                  inativo
                </span>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <InfoChip label="Função" value={colab.funcao} />
              <InfoChip label="Seção" value={colab.secao ?? '—'} />
              <InfoChip label="Filial" value={colab.filialLabel} hint={colab.filialNome ?? undefined} />
              <InfoChip
                label="Tier"
                value={(colab.tierResolvido ?? '—').toUpperCase()}
                hint={colab.nivelResolvido ?? undefined}
                highlight
              />
            </div>
          </div>

          {ehLiderAtivo && (
            <div className="shrink-0 grid place-items-center bg-conecta-accent/10 text-conecta-accent rounded-2xl px-5 py-4 min-w-[140px]">
              <Users className="h-6 w-6" />
              <div className="font-display text-3xl font-extrabold tabular-nums leading-none mt-1.5">
                {time.length}
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] font-display font-semibold mt-1">
                no time
              </div>
            </div>
          )}
        </div>
      </ConectaCard>

      {/* ===== Ocorrências do time (totais) — aparece em ambas as abas ===== */}
      {ehLiderAtivo && ocorrenciasResumo && (
        <ConectaCard>
          <SectionHeader label="Ocorrências do time efetivo" icon={AlertTriangle} className="mb-4" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiOcorrencia
              icon={AlertTriangle}
              label="Inconsistências"
              valor={ocorrenciasResumo.inconsistencias.toLocaleString('pt-BR')}
              hint={`${ocorrenciasResumo.inconsistencias > 0 ? 'ocorrências registradas' : 'sem ocorrências'}`}
              tone="amber"
            />
            <KpiOcorrencia
              icon={Clock}
              label="Banco de Horas"
              valor={`${ocorrenciasResumo.bhHoras.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}h`}
              hint={`R$ ${ocorrenciasResumo.bhValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${ocorrenciasResumo.bhColaboradores} colab.`}
              tone="primary"
            />
            <KpiOcorrencia
              icon={GraduationCap}
              label="Cursos pendentes"
              valor={ocorrenciasResumo.cursosPendentes.toLocaleString('pt-BR')}
              hint={`${ocorrenciasResumo.cursosPendentes > 0 ? 'treinamentos em aberto' : 'sem pendências'}`}
              tone="rose"
            />
            <KpiOcorrencia
              icon={CalendarDays}
              label="Feriados pendentes"
              valor={ocorrenciasResumo.feriadosPendentes.toLocaleString('pt-BR')}
              hint={`R$ ${ocorrenciasResumo.feriadosValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              tone="violet"
            />
          </div>
          <p className="text-[11px] text-conecta-muted mt-3">
            <span className="font-display font-bold text-conecta-accent tabular-nums">
              {ocorrenciasResumo.comOcorrencia}
            </span>{' '}
            de{' '}
            <span className="font-display font-bold text-conecta-primary tabular-nums">
              {ocorrenciasResumo.totalTime}
            </span>{' '}
            colaboradores do time efetivo têm ao menos uma ocorrência.
          </p>
        </ConectaCard>
      )}

      {/* ===== SubTabs ===== */}
      {ehLiderAtivo && (
        <SubTabs
          value={aba}
          onChange={setAba}
          items={[
            { id: 'principal' as Aba, label: 'Visão Geral', icon: LayoutDashboard },
            { id: 'detalhado' as Aba, label: 'Detalhado', icon: List },
          ]}
        />
      )}

      {/* ===== ABA PRINCIPAL ===== */}
      {aba === 'principal' && (
        <>
          {/* Cadeia de liderança */}
          <ConectaCard>
            <SectionHeader label="Cadeia de liderança" icon={Network} className="mb-4" />
            {cadeia.length === 0 ? (
              <p className="text-sm font-display font-semibold text-rose-600">
                Sem líder atribuído.
              </p>
            ) : (
              <ol className="flex flex-wrap items-center gap-2">
                {cadeia.map((c, i) => (
                  <li key={c.colaboradorId} className="flex items-center gap-2">
                    {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-conecta-muted/40" />}
                    <Link
                      href={`/qlp/${c.colaboradorId}`}
                      className="inline-flex items-center gap-2 rounded-full bg-conecta-primary/5 hover:bg-conecta-accent/10 px-3 py-1.5 transition-colors group"
                    >
                      <span className="text-[10px] uppercase tracking-[0.14em] font-display font-bold text-conecta-accent">
                        {c.tier}
                      </span>
                      <span className="font-display font-semibold text-conecta-primary group-hover:text-conecta-accent transition-colors">
                        {c.nome}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </ConectaCard>

          {/* Composição do time */}
          {ehLiderAtivo && time.length > 0 && (
            <TimeDistribuicaoCard time={time.map((c) => ({ funcao: c.funcao }))} />
          )}

          {/* Histórico */}
          {isAdmin && (
            <ConectaCard>
              <SectionHeader label="Histórico" icon={History} className="mb-4" />
              {historico.length === 0 ? (
                <p className="text-sm text-conecta-muted">Sem eventos registrados.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {historico.map((h) => (
                    <li
                      key={h.id}
                      className="rounded-lg bg-conecta-primary/[0.02] border border-conecta-primary/8 px-3 py-2 flex items-center gap-2 flex-wrap"
                    >
                      <span className="text-[11px] text-conecta-muted tabular-nums">
                        {new Date(h.createdAt).toLocaleString('pt-BR')}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.14em] font-display font-bold px-1.5 py-0.5 rounded bg-conecta-primary/8 text-conecta-primary">
                        {h.evento}
                      </span>
                      <span className="text-[11px] text-conecta-muted">
                        por <span className="text-conecta-primary font-display font-semibold">{h.atorNome}</span> ({h.atorTipo})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ConectaCard>
          )}
        </>
      )}

      {/* ===== ABA DETALHADO ===== */}
      {aba === 'detalhado' && ehLiderAtivo && (
        <MeuTimeTable time={time} />
      )}
    </div>
  );
}

function InfoChip({
  label, value, hint, highlight = false,
}: {
  label: string; value: string; hint?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${highlight ? 'border-conecta-accent/30 bg-conecta-accent/5' : 'border-conecta-primary/10 bg-conecta-primary/[0.02]'}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-display font-semibold text-conecta-muted">
        {label === 'Tier' && <IdCard className="h-3 w-3 text-conecta-accent" />}
        {label}
      </div>
      <div className={`mt-0.5 font-display font-bold leading-tight truncate ${highlight ? 'text-conecta-accent' : 'text-conecta-primary'}`} title={value}>
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-conecta-muted truncate mt-0.5" title={hint}>{hint}</div>
      )}
    </div>
  );
}

function KpiOcorrencia({
  icon: Icon, label, valor, hint, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; valor: string; hint?: string;
  tone: 'amber' | 'rose' | 'violet' | 'primary';
}) {
  const palette: Record<typeof tone, { bg: string; text: string; ring: string }> = {
    amber:   { bg: 'bg-amber-50',          text: 'text-amber-700',       ring: 'border-amber-200' },
    rose:    { bg: 'bg-rose-50',           text: 'text-rose-700',        ring: 'border-rose-200' },
    violet:  { bg: 'bg-violet-50',         text: 'text-violet-700',      ring: 'border-violet-200' },
    primary: { bg: 'bg-conecta-primary/5', text: 'text-conecta-primary', ring: 'border-conecta-primary/15' },
  };
  const p = palette[tone];
  return (
    <div className={`relative rounded-xl border ${p.ring} ${p.bg} p-3 overflow-hidden`}>
      <div className="flex items-start gap-3">
        <div className={`grid place-items-center h-10 w-10 rounded-lg ${p.text} bg-white/60 shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] font-display font-semibold text-conecta-muted truncate">{label}</div>
          <div className={`font-display text-2xl font-extrabold tabular-nums leading-tight truncate ${p.text}`} title={valor}>{valor}</div>
          {hint && <div className="text-[11px] text-conecta-muted mt-0.5 truncate" title={hint}>{hint}</div>}
        </div>
      </div>
    </div>
  );
}
