'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Users } from 'lucide-react';
import type { DadosBH } from '@/actions/indicadores/bh';
import { CardsResumo } from './CardsResumo';
import { RoscaTop5 } from './RoscaTop5';
import { TabelaResumoFilial } from './TabelaResumoFilial';
import { TabelaDetalhado } from './TabelaDetalhado';
import { ImportarBHDialog } from './ImportarBHDialog';
import { SubTabs } from '../_shared/SubTabs';
import { agregarResumo, top5Por, type ResumoFilial } from '@/lib/indicadores/bh-queries';
import { calcVariacao } from './variacao';

function round2(n: number) { return Math.round(n * 100) / 100; }

export function BancoHorasView({ dados, perfil }: { dados: DadosBH; perfil: 'admin' | 'filial' }) {
  const ts = dados.meta?.ultimaAtualizacao
    ? new Date(dados.meta.ultimaAtualizacao).toLocaleString('pt-BR')
    : null;
  const [funcao, setFuncao] = useState('');
  const [secao, setSecao] = useState('');
  const [filialId, setFilialId] = useState('');
  const [subTab, setSubTab] = useState<'indicadores' | 'detalhado'>('indicadores');

  const filtroAtivo = !!(funcao || secao || filialId);

  const filiaisDisponiveis = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of dados.detalhado) {
      if (r.filialId) m.set(r.filialId, r.filialNome ?? r.filialCodigo ?? r.filialId);
    }
    return [...m.entries()]
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [dados.detalhado]);

  const filialNomeAtual = filiaisDisponiveis.find((f) => f.id === filialId)?.nome ?? null;

  const detalhadoFiltrado = useMemo(() => {
    if (!filtroAtivo) return dados.detalhado;
    return dados.detalhado.filter((r) => {
      if (funcao && r.funcao !== funcao) return false;
      if (secao && r.secao !== secao) return false;
      if (filialId && r.filialId !== filialId) return false;
      return true;
    });
  }, [dados.detalhado, funcao, secao, filialId, filtroAtivo]);

  const resumoEfetivo = useMemo(
    () => (filtroAtivo ? agregarResumo(detalhadoFiltrado) : dados.resumo),
    [filtroAtivo, detalhadoFiltrado, dados.resumo],
  );

  const topFuncoesEfetivo = useMemo(
    () => (secao || filialId ? top5Por(detalhadoFiltrado, 'funcao') : dados.topFuncoes),
    [secao, filialId, detalhadoFiltrado, dados.topFuncoes],
  );
  const topSecoesEfetivo = useMemo(
    () => (funcao || filialId ? top5Por(detalhadoFiltrado, 'secao') : dados.topSecoes),
    [funcao, filialId, detalhadoFiltrado, dados.topSecoes],
  );

  const porFilialEfetivo = useMemo<ResumoFilial[]>(() => {
    if (!filtroAtivo) return dados.porFilial;
    const map = new Map<string, { nome: string | null; atual: number; anterior: number }>();
    for (const r of detalhadoFiltrado) {
      const key = r.filialId ?? `__sem__:${r.filialCodigo ?? ''}`;
      const cur = map.get(key) ?? { nome: r.filialNome, atual: 0, anterior: 0 };
      cur.atual += r.horasDecimal;
      cur.anterior += r.saldoAnterior ?? 0;
      map.set(key, cur);
    }
    return [...map.entries()]
      .map(([k, v]) => {
        const saldoAtual = round2(v.atual);
        const saldoAnterior = round2(v.anterior);
        return {
          filialId: k.startsWith('__sem__') ? null : k,
          filialNome: v.nome,
          saldoAtual,
          saldoAnterior,
          variacao: calcVariacao(saldoAtual, saldoAnterior),
        };
      })
      .sort((a, b) => b.saldoAtual - a.saldoAtual);
  }, [filtroAtivo, detalhadoFiltrado, dados.porFilial]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-[2px] w-6 bg-conecta-accent" />
            <span className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-accent font-semibold">
              Banco de Horas
            </span>
          </div>
          <h2 className="font-display text-[22px] font-extrabold text-conecta-primary tracking-tight mt-1.5">
            Visão geral
          </h2>
          <p className="text-[13px] text-conecta-muted mt-0.5">
            {ts ? `Última atualização: ${ts}${dados.meta?.atualizadoPorNome ? ` por ${dados.meta.atualizadoPorNome}` : ''}` : 'Sem dados importados.'}
          </p>
        </div>
        {perfil === 'admin' && <ImportarBHDialog />}
      </div>

      <SubTabs
        value={subTab}
        onChange={setSubTab}
        items={[
          { id: 'indicadores', label: 'Indicadores', icon: BarChart3 },
          { id: 'detalhado',   label: 'Detalhado',   icon: Users },
        ]}
      />

      {filtroAtivo && (
        <div className="flex items-center gap-2 flex-wrap text-[12px]">
          <span className="font-display uppercase tracking-[0.18em] text-conecta-muted text-[10px]">
            Filtros ativos:
          </span>
          {filialId && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 font-display font-semibold">
              Filial · {filialNomeAtual ?? filialId}
              <button type="button" onClick={() => setFilialId('')} className="text-emerald-700/70 hover:text-emerald-700">×</button>
            </span>
          )}
          {funcao && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-conecta-accent/10 text-conecta-accent font-display font-semibold">
              Função · {funcao}
              <button type="button" onClick={() => setFuncao('')} className="text-conecta-accent/70 hover:text-conecta-accent">×</button>
            </span>
          )}
          {secao && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-conecta-primary/10 text-conecta-primary font-display font-semibold">
              Seção · {secao}
              <button type="button" onClick={() => setSecao('')} className="text-conecta-primary/70 hover:text-conecta-primary">×</button>
            </span>
          )}
          <button
            type="button"
            onClick={() => { setFuncao(''); setSecao(''); setFilialId(''); }}
            className="text-conecta-muted hover:text-conecta-accent text-[11px] font-display uppercase tracking-[0.18em]"
          >
            Limpar tudo
          </button>
        </div>
      )}

      <CardsResumo r={resumoEfetivo} />

      {subTab === 'indicadores' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RoscaTop5
              titulo="Top 5 funções (horas · valor)"
              dados={topFuncoesEfetivo}
              color="navy"
              selecionado={funcao}
              onSelect={setFuncao}
            />
            <RoscaTop5
              titulo="Top 5 seções (horas · valor)"
              dados={topSecoesEfetivo}
              color="orange"
              selecionado={secao}
              onSelect={setSecao}
            />
          </div>

          <TabelaResumoFilial rows={porFilialEfetivo} />
        </>
      ) : (
        <TabelaDetalhado
          rows={dados.detalhado}
          secoes={dados.filtros.secoes}
          funcoes={dados.filtros.funcoes}
          funcao={funcao}
          setFuncao={setFuncao}
          secao={secao}
          setSecao={setSecao}
          filialId={filialId}
          setFilialId={setFilialId}
          filiais={filiaisDisponiveis}
          mostrarFilialFiltro={perfil === 'admin'}
        />
      )}
    </div>
  );
}
