'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';

export interface LiderCard {
  id: string;
  colaborador_id: string;
  tier: string;
  nivel: string | null;
  escopo_nacional: boolean;
  filiais_escopo_count: number;
  nome: string;
  funcao: string;
  codfilial: number;
  qtd_diretos: number;
  qtd_total: number;
  lider_pai_id?: string | null;
  filial_id?: string | null;
  filiais_escopo?: unknown;
}

interface LiderNode extends LiderCard {
  children: LiderNode[];
}

// Constrói a árvore de líderes a partir da lista plana
function buildTree(lideres: LiderCard[]): LiderNode[] {
  const map: Record<string, LiderNode> = {};
  const roots: LiderNode[] = [];

  lideres.forEach((l) => {
    map[l.id] = { ...l, children: [] };
  });

  lideres.forEach((l) => {
    const node = map[l.id];
    if (!node) return;

    if (l.lider_pai_id) {
      const parentNode = map[l.lider_pai_id];
      if (parentNode) {
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
}

// Filtra a árvore de forma recursiva
// Mantém os nós que dão match ou que têm algum descendente que dê match
function filterTree(nodes: LiderNode[], term: string): LiderNode[] {
  if (!term.trim()) return nodes;

  return nodes
    .map((node) => {
      const matchSelf = `${node.nome} ${node.funcao}`.toLowerCase().includes(term.toLowerCase());
      const filteredChildren = filterTree(node.children, term);

      if (matchSelf || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      return null;
    })
    .filter((n): n is LiderNode => n !== null);
}

export function OrgChartTree({
  lideres,
  filiais,
  forceFilialId,
}: {
  lideres: LiderCard[];
  filiais: { id: string; codigo: string; nome: string }[];
  forceFilialId?: string | null;
}) {
  const [filtro, setFiltro] = useState('');
  const [filtroFilial, setFiltroFilial] = useState(forceFilialId ?? '');

  const filialEfetiva = forceFilialId ?? filtroFilial;

  const treeData = useMemo(() => {
    // 1. Filtragem por filial na lista plana
    const lideresFiltrados = lideres.filter((l) => {
      if (!filialEfetiva) return true;

      // Nacionais entram em todas as filiais
      if (l.escopo_nacional) return true;

      // Líderes da própria filial filtrada
      if (l.filial_id === filialEfetiva) return true;

      // Regionais / Multi-filiais que possuem vínculo (estão no escopo de filiais)
      const escopo = typeof l.filiais_escopo === 'string'
        ? JSON.parse(l.filiais_escopo)
        : l.filiais_escopo;

      if (Array.isArray(escopo) && escopo.includes(filialEfetiva)) {
        return true;
      }

      return false;
    });

    // 2. Construção da árvore hierárquica baseada nos líderes elegíveis
    const fullTree = buildTree(lideresFiltrados);

    // 3. Filtragem por nome / função na árvore construída
    return filterTree(fullTree, filtro);
  }, [lideres, filtro, filialEfetiva]);

  return (
    <div className="space-y-6">
      {/* Container de Filtros */}
      <div className="rounded-2xl bg-white border border-conecta-primary/10 p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-conecta-muted/80 mb-1">
            Buscar por Nome ou Função
          </label>
          <input
            type="search"
            placeholder="Buscar líder por nome ou função…"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full rounded-lg border border-conecta-primary/15 px-3 py-2 text-sm focus:outline-none focus:border-conecta-accent/60"
          />
        </div>
        {!forceFilialId && (
          <div className="w-full sm:w-72">
            <label className="block text-xs font-semibold text-conecta-muted/80 mb-1">
              Filtrar por Filial
            </label>
            <select
              value={filtroFilial}
              onChange={(e) => setFiltroFilial(e.target.value)}
              className="w-full rounded-lg border border-conecta-primary/15 px-3 py-2 text-sm bg-white focus:outline-none focus:border-conecta-accent/60"
            >
              <option value="">Todas as Filiais</option>
              {filiais.map((f) => (
                <option key={f.id} value={f.id}>
                  Filial {f.codigo} - {f.nome}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Árvore do Organograma */}
      <div className="overflow-x-auto pb-6 w-full">
        <div className="flex flex-col items-center min-w-max p-4">
          {treeData.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-conecta-primary/15 p-8 text-sm text-conecta-muted/60 text-center max-w-sm">
              Nenhum líder encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="flex gap-16 justify-center">
              {treeData.map((root) => (
                <div key={root.id} className="flex flex-col items-center">
                  <TreeNode node={root} depth={0} searchTerm={filtro} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TreeNode({ node, depth, searchTerm }: { node: LiderNode; depth: number; searchTerm: string }) {
  const matchSelf = useMemo(() => {
    if (!searchTerm.trim()) return false;
    return `${node.nome} ${node.funcao}`.toLowerCase().includes(searchTerm.toLowerCase());
  }, [node, searchTerm]);

  return (
    <div className="flex flex-col items-center">
      <Card lider={node} highlight={matchSelf} />

      {node.children.length > 0 && (
        <div className="flex flex-col items-center relative">
          {/* Linha vertical que desce do pai */}
          <div className="w-px h-6 bg-conecta-primary/20" />

          {/* Container dos filhos (lado a lado) */}
          <div className="flex gap-8 relative">
            {node.children.map((child, index) => {
              const isFirst = index === 0;
              const isLast = index === node.children.length - 1;
              const hasSiblings = node.children.length > 1;

              return (
                <div key={child.id} className="relative flex flex-col items-center">
                  {/* Linhas horizontais de conexão para irmãos */}
                  {hasSiblings && (
                    <div
                      className={`absolute top-0 h-px bg-conecta-primary/20 ${
                        isFirst ? 'left-1/2 right-0' : isLast ? 'left-0 right-1/2' : 'left-0 right-0'
                      }`}
                    />
                  )}

                  {/* Linha vertical que sobe para o conector */}
                  <div className="w-px h-6 bg-conecta-primary/20 relative z-10" />

                  <TreeNode node={child} depth={depth + 1} searchTerm={searchTerm} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ lider, highlight }: { lider: LiderCard; highlight: boolean }) {
  // Cores do card
  const borderClass = highlight
    ? 'border-conecta-accent ring-2 ring-conecta-accent/30 shadow-lg shadow-conecta-accent/5'
    : 'border-conecta-primary/10 hover:border-conecta-accent/40 hover:shadow-[0_12px_28px_-12px_rgba(13,43,107,0.25)]';

  const isSupervisor = lider.tier === 'supervisor' || lider.tier === 'encarregado';

  return (
    <Link
      href={`/qlp/${lider.colaborador_id}`}
      className={`block rounded-2xl bg-white border p-3.5 w-[260px] transition-all duration-300 ${borderClass}`}
    >
      <div className="text-[14px] font-display font-extrabold text-conecta-primary leading-tight truncate" title={lider.nome}>
        {lider.nome}
      </div>
      <div className="text-[12px] text-conecta-muted mt-0.5 leading-tight truncate" title={lider.funcao}>
        {lider.funcao}
      </div>
      <div className="text-[11px] text-conecta-muted/70 mt-1 flex justify-between items-center">
        <span>Filial {lider.codfilial}</span>
        <span className="uppercase text-[9px] font-semibold tracking-wider text-conecta-accent/80">
          {lider.tier}
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mt-3">
        <span className="rounded-full bg-conecta-primary/5 text-conecta-primary text-[11px] px-2 py-0.5 tabular-nums font-semibold">
          {lider.qtd_diretos} diretos
        </span>
        <span className="rounded-full bg-conecta-accent/10 text-conecta-accent text-[11px] px-2 py-0.5 tabular-nums font-semibold">
          {lider.qtd_total} total
        </span>
        {!isSupervisor && (
          lider.escopo_nacional ? (
            <span className="rounded-full bg-violet-100 text-violet-900 text-[10px] px-2 py-0.5 uppercase tracking-wide">
              nacional
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 text-amber-900 text-[10px] px-2 py-0.5 truncate max-w-[80px]" title={`${lider.filiais_escopo_count} filial(is)`}>
              {lider.filiais_escopo_count} fil.
            </span>
          )
        )}
      </div>
    </Link>
  );
}
