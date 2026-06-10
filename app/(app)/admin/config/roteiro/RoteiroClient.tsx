'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Pencil, X } from 'lucide-react';
import { criarPergunta, atualizarPergunta, removerPergunta } from '@/actions/admin';
import { useConfirm } from '@/components/ui/confirm-dialog';

type Pergunta = {
  id: string; cargo: string; ordem: number; pergunta: string;
  tipo: string; opcoes: string[] | null; ativo: boolean;
};
type Draft = Omit<Pergunta, 'id'>;

const TIPOS = [
  { v: 'texto', label: 'Texto livre' },
  { v: 'sim-nao', label: 'Sim / Não' },
  { v: 'escala', label: 'Escala 1–5' },
  { v: 'select', label: 'Seleção (opções)' },
  { v: 'multi', label: 'Múltipla escolha (vários)' },
] as const;

function emptyDraft(cargo = 'TODOS'): Draft {
  return { cargo, ordem: 1, pergunta: '', tipo: 'texto', opcoes: null, ativo: true };
}

export function RoteiroClient({ perguntas, cargos }: { perguntas: Pergunta[]; cargos: string[] }) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [novo, setNovo] = useState<Draft>(emptyDraft());
  const [novoOpcoesTxt, setNovoOpcoesTxt] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [draftOpcoesTxt, setDraftOpcoesTxt] = useState('');
  const [filtroCargo, setFiltroCargo] = useState<string>('TODOS-ALL');
  const [pending, start] = useTransition();

  const filtradas = filtroCargo === 'TODOS-ALL' ? perguntas : perguntas.filter((p) => p.cargo === filtroCargo);

  const adicionar = () => {
    if (!novo.pergunta.trim()) { toast.error('Informe a pergunta'); return; }
    const precisaOpcoes = novo.tipo === 'select' || novo.tipo === 'multi';
    const opcoes = precisaOpcoes
      ? novoOpcoesTxt.split('\n').map((s) => s.trim()).filter(Boolean)
      : undefined;
    if (precisaOpcoes && (!opcoes || opcoes.length === 0)) { toast.error('Adicione opções (uma por linha)'); return; }
    start(async () => {
      try {
        await criarPergunta({ cargo: novo.cargo, ordem: novo.ordem, pergunta: novo.pergunta, tipo: novo.tipo, opcoes });
        toast.success('Pergunta criada');
        setNovo(emptyDraft(novo.cargo));
        setNovoOpcoesTxt('');
        router.refresh();
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    });
  };

  const iniciarEdicao = (p: Pergunta) => {
    setEditId(p.id);
    setDraft({ cargo: p.cargo, ordem: p.ordem, pergunta: p.pergunta, tipo: p.tipo, opcoes: p.opcoes, ativo: p.ativo });
    setDraftOpcoesTxt((p.opcoes ?? []).join('\n'));
  };

  const salvar = (id: string) => {
    const opcoes = draft.tipo === 'select' || draft.tipo === 'multi'
      ? draftOpcoesTxt.split('\n').map((s) => s.trim()).filter(Boolean)
      : undefined;
    start(async () => {
      try {
        await atualizarPergunta(id, { ...draft, opcoes });
        toast.success('Atualizada');
        setEditId(null);
        router.refresh();
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    });
  };

  const excluir = async (p: Pergunta) => {
    if (!(await confirmar({ titulo: 'Excluir pergunta', descricao: `Excluir a pergunta "${p.pergunta.slice(0, 50)}…"?`, perigo: true, confirmLabel: 'Excluir' }))) return;
    start(async () => {
      try {
        await removerPergunta(p.id);
        toast.success('Removida');
        router.refresh();
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Erro'); }
    });
  };

  return (
    <div className="space-y-5">
      {/* Filtro */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-perlog-slate">Filtrar por cargo:</span>
        <select value={filtroCargo} onChange={(e) => setFiltroCargo(e.target.value)} className="h-8 rounded-md border border-slate-200 bg-white text-sm px-2">
          <option value="TODOS-ALL">Todos os cargos</option>
          {cargos.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Nova pergunta */}
      <div className="rounded-lg border border-perlog-orange/20 bg-perlog-orange/5 p-3 space-y-2">
        <p className="text-xs font-semibold text-perlog-navy uppercase">Nova pergunta</p>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <select value={novo.cargo} onChange={(e) => setNovo({ ...novo, cargo: e.target.value })} className="h-9 sm:col-span-3 rounded-md border border-slate-200 bg-white text-sm px-2">
            {cargos.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="number" placeholder="Ordem" value={novo.ordem} onChange={(e) => setNovo({ ...novo, ordem: Number(e.target.value) })}
            className="h-9 sm:col-span-1 rounded-md border border-slate-200 bg-white text-sm px-2" />
          <select value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value })} className="h-9 sm:col-span-3 rounded-md border border-slate-200 bg-white text-sm px-2">
            {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
          </select>
          <input placeholder="Pergunta" value={novo.pergunta} onChange={(e) => setNovo({ ...novo, pergunta: e.target.value })}
            className="h-9 sm:col-span-4 rounded-md border border-slate-200 bg-white text-sm px-3" />
          <button onClick={adicionar} disabled={pending}
            className="h-9 sm:col-span-1 inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium bg-perlog-orange text-white hover:bg-perlog-orange/90 disabled:opacity-50">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {(novo.tipo === 'select' || novo.tipo === 'multi') && (
          <textarea
            placeholder="Opções (uma por linha)&#10;Ex: Excelente&#10;Bom&#10;Regular"
            value={novoOpcoesTxt}
            onChange={(e) => setNovoOpcoesTxt(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-200 bg-white text-sm px-3 py-2"
          />
        )}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtradas.length === 0 && <p className="text-sm text-perlog-slate text-center py-6">Nenhuma pergunta configurada.</p>}
        {filtradas.map((p) => (
          <div key={p.id} className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50/40">
            {editId === p.id ? (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <select value={draft.cargo} onChange={(e) => setDraft({ ...draft, cargo: e.target.value })} className="h-8 sm:col-span-3 rounded border border-slate-200 px-2 text-sm">
                    {cargos.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="number" value={draft.ordem} onChange={(e) => setDraft({ ...draft, ordem: Number(e.target.value) })} className="h-8 sm:col-span-1 rounded border border-slate-200 px-2 text-sm" />
                  <select value={draft.tipo} onChange={(e) => setDraft({ ...draft, tipo: e.target.value })} className="h-8 sm:col-span-3 rounded border border-slate-200 px-2 text-sm">
                    {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                  </select>
                  <label className="inline-flex items-center gap-1 sm:col-span-2 text-xs text-perlog-slate"><input type="checkbox" checked={draft.ativo} onChange={(e) => setDraft({ ...draft, ativo: e.target.checked })} />Ativa</label>
                  <div className="sm:col-span-3 flex gap-1 justify-end">
                    <button onClick={() => salvar(p.id)} disabled={pending} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-perlog-orange text-white"><Save className="h-3 w-3" />Salvar</button>
                    <button onClick={() => setEditId(null)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-slate-200"><X className="h-3 w-3" /></button>
                  </div>
                </div>
                <textarea value={draft.pergunta} onChange={(e) => setDraft({ ...draft, pergunta: e.target.value })} rows={2}
                  className="w-full rounded border border-slate-200 px-2 py-1 text-sm" />
                {(draft.tipo === 'select' || draft.tipo === 'multi') && (
                  <textarea placeholder="Opções (uma por linha)" value={draftOpcoesTxt} onChange={(e) => setDraftOpcoesTxt(e.target.value)} rows={3}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm" />
                )}
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
                    <span className="px-2 py-0.5 rounded bg-perlog-navy text-white font-medium">{p.cargo}</span>
                    <span className="text-perlog-slate">#{p.ordem}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-perlog-navy">{TIPOS.find((t) => t.v === p.tipo)?.label ?? p.tipo}</span>
                    {!p.ativo && <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">Inativa</span>}
                  </div>
                  <p className="text-sm text-perlog-navy">{p.pergunta}</p>
                  {p.opcoes && p.opcoes.length > 0 && (
                    <p className="text-xs text-perlog-slate mt-1">Opções: {p.opcoes.join(' · ')}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => iniciarEdicao(p)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-slate-200 hover:bg-slate-50"><Pencil className="h-3 w-3" /></button>
                  <button onClick={() => excluir(p)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-red-200 text-red-700 hover:bg-red-50"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
