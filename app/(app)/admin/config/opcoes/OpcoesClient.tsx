'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, Save } from 'lucide-react';
import { salvarOpcoes, removerOpcao } from '@/actions/admin';
import { useConfirm } from '@/components/ui/confirm-dialog';

type Opcao = { chave: string; valores: string[] };

const SUGESTOES: Array<{ chave: string; label: string }> = [
  { chave: 'escolaridade', label: 'Escolaridade' },
  { chave: 'estado_civil', label: 'Estado civil' },
  { chave: 'cnh', label: 'CNH' },
  { chave: 'status', label: 'Status da entrevista' },
  { chave: 'turnos', label: 'Turnos' },
];

export function OpcoesClient({ opcoes }: { opcoes: Opcao[] }) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [novaChave, setNovaChave] = useState('');
  const [edits, setEdits] = useState<Record<string, string>>(
    Object.fromEntries(opcoes.map((o) => [o.chave, o.valores.join('\n')]))
  );
  const [pending, start] = useTransition();

  const chaveExistente = new Set(opcoes.map((o) => o.chave));

  const criarNova = (chave?: string) => {
    const k = (chave ?? novaChave).trim().toLowerCase();
    if (!k) return;
    if (chaveExistente.has(k)) { toast.error('Chave já existe'); return; }
    setEdits((e) => ({ ...e, [k]: '' }));
    setNovaChave('');
    // Salva vazia já criando a entrada
    start(async () => {
      try {
        await salvarOpcoes(k, []);
        toast.success(`Lista "${k}" criada`);
        router.refresh();
      } catch (err) { toast.error(err instanceof Error ? err.message : 'Erro'); }
    });
  };

  const salvarLista = (chave: string) => {
    const valores = (edits[chave] ?? '').split('\n').map((v) => v.trim()).filter(Boolean);
    start(async () => {
      try {
        await salvarOpcoes(chave, valores);
        toast.success(`"${chave}" salva (${valores.length} valor(es))`);
        router.refresh();
      } catch (err) { toast.error(err instanceof Error ? err.message : 'Erro'); }
    });
  };

  const excluir = async (chave: string) => {
    if (!(await confirmar({ titulo: 'Excluir lista', descricao: `Excluir a lista "${chave}"? Campos do wizard que usam essa chave ficarão sem opções.`, perigo: true, confirmLabel: 'Excluir' }))) return;
    start(async () => {
      try {
        await removerOpcao(chave);
        toast.success('Removida');
        setEdits((e) => { const c = { ...e }; delete c[chave]; return c; });
        router.refresh();
      } catch (err) { toast.error(err instanceof Error ? err.message : 'Erro'); }
    });
  };

  const sugestoesPendentes = SUGESTOES.filter((s) => !chaveExistente.has(s.chave));

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-perlog-orange/20 bg-perlog-orange/5 p-3 space-y-2">
        <p className="text-xs font-semibold text-perlog-navy uppercase">Criar nova lista</p>
        <div className="flex gap-2">
          <input
            value={novaChave}
            onChange={(e) => setNovaChave(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') criarNova(); }}
            placeholder="Chave (ex: nivel_ingles)"
            className="h-9 flex-1 rounded-md border border-slate-200 bg-white text-sm px-3 font-mono"
          />
          <button onClick={() => criarNova()} disabled={pending || !novaChave.trim()}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium bg-perlog-orange text-white hover:bg-perlog-orange/90 disabled:opacity-50">
            <Plus className="h-4 w-4" /> Criar
          </button>
        </div>
        {sugestoesPendentes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] text-perlog-slate">Sugestões:</span>
            {sugestoesPendentes.map((s) => (
              <button key={s.chave} onClick={() => criarNova(s.chave)}
                className="px-2 py-0.5 rounded text-[11px] border border-slate-200 hover:bg-perlog-orange/10 text-perlog-navy">
                + {s.label} <span className="text-perlog-slate">({s.chave})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {opcoes.length === 0 && <p className="text-sm text-perlog-slate text-center py-6 col-span-full">Nenhuma lista cadastrada.</p>}
        {opcoes.map((o) => (
          <div key={o.chave} className="rounded-lg border border-slate-200 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-semibold text-perlog-navy bg-slate-100 px-2 py-0.5 rounded">{o.chave}</code>
              <div className="flex gap-1">
                <button onClick={() => salvarLista(o.chave)} disabled={pending} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-perlog-orange text-white hover:bg-perlog-orange/90 disabled:opacity-50"><Save className="h-3 w-3" />Salvar</button>
                <button onClick={() => excluir(o.chave)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-red-200 text-red-700 hover:bg-red-50"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
            <textarea
              value={edits[o.chave] ?? ''}
              onChange={(e) => setEdits((prev) => ({ ...prev, [o.chave]: e.target.value }))}
              placeholder="Um valor por linha"
              rows={6}
              className="w-full rounded-md border border-slate-200 bg-white text-sm px-3 py-2 font-mono"
            />
            <p className="text-[11px] text-perlog-slate">{(edits[o.chave] ?? '').split('\n').filter((s) => s.trim()).length} valor(es) · um por linha</p>
          </div>
        ))}
      </div>
    </div>
  );
}
