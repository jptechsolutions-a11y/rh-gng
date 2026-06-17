'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Users } from 'lucide-react';
import type { DadosCursos } from '@/actions/indicadores/cursos';
import type { ResumoFilialCursos } from '@/lib/indicadores/cursos-queries';
import { calcVariacao } from '../bh/variacao';
import { CardsResumoCursos } from './CardsResumo';
import { RoscaTop5Cursos } from './RoscaTop5';
import { TabelaResumoFilialCursos } from './TabelaResumoFilial';
import { TabelaDetalhadoCursos } from './TabelaDetalhado';
import { ImportarCursosDialog } from './ImportarCursosDialog';
import { SubTabs } from '../_shared/SubTabs';

export function CursosView({ dados, perfil }: { dados: DadosCursos; perfil: 'admin' | 'filial' }) {
  const ts = dados.meta?.ultimaAtualizacao
    ? new Date(dados.meta.ultimaAtualizacao).toLocaleString('pt-BR')
    : null;
  const [funcao, setFuncao] = useState('');
  const [secao, setSecao] = useState('');
  const [filialId, setFilialId] = useState('');
  const [subTab, setSubTab] = useState<'indicadores' | 'detalhado'>('indicadores');

  const filtroAtivo = !!(funcao || secao || filialId);

  const filiaisDisponiveis = useMemo(() => {
    return dados.porFilial
      .filter((f) => f.filialId)
      .map((f) => ({ id: f.filialId as string, nome: f.filialCodigo ?? f.filialNome ?? f.filialId as string }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [dados.porFilial]);

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

  const resumoEfetivo = useMemo(() => {
    if (!filtroAtivo) return dados.resumo;
    const totalPendencias = detalhadoFiltrado.reduce((a, r) => a + r.qtdPendencias, 0);
    const colaboradores = detalhadoFiltrado.length;
    const mediaPorPessoa = colaboradores === 0 ? 0 : totalPendencias / colaboradores;
    return {
      colaboradores,
      totalPendencias,
      mediaPorPessoa: Math.round(mediaPorPessoa * 100) / 100,
    };
  }, [filtroAtivo, detalhadoFiltrado, dados.resumo]);

  const resumoAnteriorEfetivo = useMemo(() => {
    if (!filtroAtivo) return dados.resumoAnterior;
    const totalPendencias = detalhadoFiltrado.reduce((a, r) => a + r.qtdAnterior, 0);
    const colaboradores = detalhadoFiltrado.filter((r) => r.qtdAnterior > 0).length;
    const mediaPorPessoa = colaboradores === 0 ? 0 : totalPendencias / colaboradores;
    return {
      colaboradores,
      totalPendencias,
      mediaPorPessoa: Math.round(mediaPorPessoa * 100) / 100,
    };
  }, [filtroAtivo, detalhadoFiltrado, dados.resumoAnterior]);

  const recomputeTop = (campo: 'funcao' | 'secao') => {
    const map = new Map<string, number>();
    for (const r of detalhadoFiltrado) {
      const k = (r[campo] ?? '').trim();
      if (!k) continue;
      map.set(k, (map.get(k) ?? 0) + r.qtdPendencias);
    }
    const total = detalhadoFiltrado.reduce((a, r) => a + r.qtdPendencias, 0) || 1;
    return [...map.entries()]
      .map(([label, valor]) => ({
        label, valor,
        pct: Math.round((valor / total) * 1000) / 10,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  };

  const recomputeTopTipo = () => {
    const map = new Map<string, number>();
    let total = 0;
    for (const r of detalhadoFiltrado) {
      for (const o of r.ocorrencias) {
        const k = (o.tipo ?? '').trim();
        if (!k) continue;
        map.set(k, (map.get(k) ?? 0) + 1);
        total += 1;
      }
    }
    const t = total || 1;
    return [...map.entries()]
      .map(([label, valor]) => ({
        label, valor,
        pct: Math.round((valor / t) * 1000) / 10,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
  };

  const topFuncoesEfetivo = useMemo(
    () => (secao || filialId ? recomputeTop('funcao') : dados.topFuncoes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [secao, filialId, detalhadoFiltrado, dados.topFuncoes],
  );
  const topSecoesEfetivo = useMemo(
    () => (funcao || filialId ? recomputeTop('secao') : dados.topSecoes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [funcao, filialId, detalhadoFiltrado, dados.topSecoes],
  );
  const topTiposEfetivo = useMemo(
    () => (filtroAtivo ? recomputeTopTipo() : dados.topTipos),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtroAtivo, detalhadoFiltrado, dados.topTipos],
  );

  const porFilialEfetivo = useMemo<ResumoFilialCursos[]>(() => {
    if (!filtroAtivo) return dados.porFilial;
    const map = new Map<string, { nome: string | null; codigo: string | null; atual: number; anterior: number; chapas: Set<string> }>();
    for (const r of detalhadoFiltrado) {
      const key = r.filialId ?? '__sem__';
      const filialRowSrc = dados.porFilial.find((p) => p.filialId === r.filialId);
      const cur = map.get(key) ?? {
        nome: filialRowSrc?.filialNome ?? null,
        codigo: filialRowSrc?.filialCodigo ?? null,
        atual: 0, anterior: 0,
        chapas: new Set<string>(),
      };
      cur.atual += r.qtdPendencias;
      cur.anterior += r.qtdAnterior;
      cur.chapas.add(r.chapa);
      map.set(key, cur);
    }
    return [...map.entries()]
      .map(([k, v]) => ({
        filialId: k === '__sem__' ? null : k,
        filialNome: v.nome,
        filialCodigo: v.codigo,
        qtdAtual: v.atual,
        qtdAnterior: v.anterior,
        qtdColaboradores: v.chapas.size,
        variacao: calcVariacao(v.atual, v.anterior),
      }))
      .sort((a, b) => b.qtdAtual - a.qtdAtual);
  }, [filtroAtivo, detalhadoFiltrado, dados.porFilial]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-[2px] w-6 bg-conecta-accent" />
            <span className="font-display text-[10px] uppercase tracking-[0.32em] text-conecta-accent font-semibold">
              Cursos Obrigatórios
            </span>
          </div>
          <h2 className="font-display text-[22px] font-extrabold text-conecta-primary tracking-tight mt-1.5">
            Visão geral
          </h2>
          <p className="text-[13px] text-conecta-muted mt-0.5">
            {ts ? `Última atualização: ${ts}${dados.meta?.atualizadoPorNome ? ` por ${dados.meta.atualizadoPorNome}` : ''}` : 'Sem dados importados.'}
          </p>
        </div>
        {perfil === 'admin' && <ImportarCursosDialog />}
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

      <CardsResumoCursos r={resumoEfetivo} ant={resumoAnteriorEfetivo} />

      {subTab === 'indicadores' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <RoscaTop5Cursos
              titulo="Top 5 funções (pendências)"
              dados={topFuncoesEfetivo}
              color="orange"
              selecionado={funcao}
              onSelect={setFuncao}
            />
            <RoscaTop5Cursos
              titulo="Top 5 seções (pendências)"
              dados={topSecoesEfetivo}
              color="navy"
              selecionado={secao}
              onSelect={setSecao}
            />
            <RoscaTop5Cursos
              titulo="Top 5 tipos (pendências)"
              dados={topTiposEfetivo}
              color="orange"
            />
          </div>

          <TabelaResumoFilialCursos rows={porFilialEfetivo} />
        </>
      ) : (
        <TabelaDetalhadoCursos
          rows={dados.detalhado}
          funcoes={dados.filtros.funcoes}
          secoes={dados.filtros.secoes}
          filiais={filiaisDisponiveis}
          funcao={funcao}
          setFuncao={setFuncao}
          secao={secao}
          setSecao={setSecao}
          filialId={filialId}
          setFilialId={setFilialId}
          mostrarFilialFiltro={perfil === 'admin'}
        />
      )}
    </div>
  );
}
