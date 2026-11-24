'use client';

import { useState, useTransition } from 'react';
import { CalendarDays, Plus, Trash2, Check, X } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { Input } from '@/components/ui/input';
import { atualizarEscala, criarEscala, excluirEscala } from '@/actions/qlp/escalas';
import { DIAS_SEMANA, formatarDias } from '@/lib/qlp/escala';

export interface EscalaRow {
  id: string;
  nome: string;
  dias: number[];
  ativo: boolean;
  qtd: number;
}

function mensagem(e: unknown): string {
  return e instanceof Error ? e.message : 'Não foi possível salvar.';
}

function SeletorDias({
  dias,
  onChange,
}: {
  dias: number[];
  onChange: (d: number[]) => void;
}) {
  const toggle = (v: number) =>
    onChange(dias.includes(v) ? dias.filter((d) => d !== v) : [...dias, v].sort((a, b) => a - b));
  return (
    <div className="flex flex-wrap gap-1.5">
      {DIAS_SEMANA.map((d) => {
        const on = dias.includes(d.valor);
        return (
          <button
            key={d.valor}
            type="button"
            title={d.longo}
            aria-pressed={on}
            onClick={() => toggle(d.valor)}
            className={`min-w-[44px] rounded-lg border px-2 py-1.5 text-[12px] font-display font-semibold transition ${
              on
                ? 'border-conecta-accent bg-conecta-accent text-white'
                : 'border-conecta-primary/15 bg-white text-conecta-muted hover:bg-slate-50'
            }`}
          >
            {d.curto}
          </button>
        );
      })}
    </div>
  );
}

export function EscalasEditor({ escalas }: { escalas: EscalaRow[] }) {
  const [novoNome, setNovoNome] = useState('');
  const [novosDias, setNovosDias] = useState<number[]>([1, 2, 3, 4, 5]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editDias, setEditDias] = useState<number[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function executar(fn: () => Promise<void>, aoSucesso?: () => void) {
    setErro(null);
    start(async () => {
      try {
        await fn();
        aoSucesso?.();
      } catch (e) {
        setErro(mensagem(e));
      }
    });
  }

  function criar() {
    executar(
      () => criarEscala({ nome: novoNome, dias: novosDias }),
      () => {
        setNovoNome('');
        setNovosDias([1, 2, 3, 4, 5]);
      },
    );
  }

  function iniciarEdicao(e: EscalaRow) {
    setEditId(e.id);
    setEditNome(e.nome);
    setEditDias(e.dias);
    setErro(null);
  }

  function salvarEdicao(e: EscalaRow) {
    executar(
      () => atualizarEscala({ id: e.id, nome: editNome, dias: editDias, ativo: e.ativo }),
      () => setEditId(null),
    );
  }

  function alternarAtivo(e: EscalaRow) {
    executar(() => atualizarEscala({ id: e.id, nome: e.nome, dias: e.dias, ativo: !e.ativo }));
  }

  function excluir(e: EscalaRow) {
    if (!window.confirm(`Excluir a escala "${e.nome}"?`)) return;
    executar(() => excluirEscala(e.id));
  }

  return (
    <div className="space-y-5">
      <ConectaCard>
        <SectionHeader label="Nova escala" icon={Plus} className="mb-4" />
        <div className="grid gap-3 md:grid-cols-[minmax(0,260px)_1fr_auto] md:items-end">
          <div>
            <label className="mb-1 block text-[11px] font-display font-semibold uppercase tracking-[0.14em] text-conecta-muted">
              Nome
            </label>
            <Input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Ex.: Segunda a Sábado"
              maxLength={60}
              className="border-conecta-primary/15 focus-visible:ring-conecta-accent/30"
            />
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-display font-semibold uppercase tracking-[0.14em] text-conecta-muted">
              Dias trabalhados
            </span>
            <SeletorDias dias={novosDias} onChange={setNovosDias} />
          </div>
          <button
            type="button"
            onClick={criar}
            disabled={pending || !novoNome.trim() || novosDias.length === 0}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-conecta-accent px-4 py-2 text-[12px] font-display font-semibold uppercase tracking-[0.14em] text-white transition hover:brightness-110 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Criar
          </button>
        </div>
      </ConectaCard>

      {erro && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {erro}
        </p>
      )}

      <ConectaCard noPadding>
        <div className="p-5 pb-3">
          <SectionHeader label={`Escalas (${escalas.length})`} icon={CalendarDays} />
        </div>
        <div className="overflow-x-auto">
          <table className="conecta-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Dias</th>
                <th className="text-center">Colaboradores</th>
                <th className="text-center">Situação</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {escalas.map((e) => {
                const editando = editId === e.id;
                return (
                  <tr key={e.id} className={e.ativo ? '' : 'opacity-60'}>
                    <td className="font-display font-semibold text-conecta-primary">
                      {editando ? (
                        <Input
                          value={editNome}
                          onChange={(ev) => setEditNome(ev.target.value)}
                          maxLength={60}
                          className="h-8 border-conecta-primary/15"
                        />
                      ) : (
                        e.nome
                      )}
                    </td>
                    <td className="text-conecta-muted">
                      {editando ? (
                        <SeletorDias dias={editDias} onChange={setEditDias} />
                      ) : (
                        formatarDias(e.dias)
                      )}
                    </td>
                    <td className="text-center tabular-nums font-display font-bold text-conecta-primary">
                      {e.qtd}
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        onClick={() => alternarAtivo(e)}
                        disabled={pending || editando}
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          e.ativo
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-conecta-muted'
                        }`}
                        title={e.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                      >
                        {e.ativo ? 'Ativa' : 'Desativada'}
                      </button>
                    </td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {editando ? (
                          <>
                            <button
                              type="button"
                              onClick={() => salvarEdicao(e)}
                              disabled={pending || !editNome.trim() || editDias.length === 0}
                              className="inline-flex items-center gap-1 rounded-lg bg-conecta-accent px-2.5 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" /> Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditId(null)}
                              className="inline-flex items-center rounded-lg border border-conecta-primary/15 px-2 py-1.5 text-conecta-muted hover:bg-slate-50"
                              aria-label="Cancelar edição"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => iniciarEdicao(e)}
                              className="rounded-lg border border-conecta-primary/15 px-2.5 py-1.5 text-[11px] font-display font-semibold uppercase tracking-[0.14em] text-conecta-primary hover:bg-slate-50"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => excluir(e)}
                              disabled={pending || e.qtd > 0}
                              title={e.qtd > 0 ? 'Há colaboradores nesta escala — desative em vez de excluir' : 'Excluir'}
                              className="inline-flex items-center rounded-lg border border-rose-200 px-2 py-1.5 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Excluir escala"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {escalas.length === 0 && (
          <p className="py-8 text-center text-sm text-conecta-muted">Nenhuma escala cadastrada.</p>
        )}
      </ConectaCard>
    </div>
  );
}
