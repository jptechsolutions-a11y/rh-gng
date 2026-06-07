'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Power, X, Save } from 'lucide-react';
import {
  criarCompetencia, atualizarCompetencia, inativarCompetencia,
  criarFator, atualizarFator, inativarFator,
} from '@/actions/avaliacao-admin';
import { useConfirm } from '@/components/ui/confirm-dialog';

type Fator = {
  id: string;
  competenciaId: string;
  ordem: number;
  texto: string;
  escalaMax: number;
  ativo: boolean;
};

type Competencia = {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  peso: string;
  ativo: boolean;
  fatores: Fator[];
};

type CompForm = { nome: string; descricao: string; ordem: number; peso: number; ativo: boolean };
type FatorForm = { competenciaId: string; ordem: number; texto: string; escalaMax: number; ativo: boolean };

const emptyComp: CompForm = { nome: '', descricao: '', ordem: 0, peso: 1, ativo: true };
const emptyFator = (competenciaId: string, ordem = 0): FatorForm => ({
  competenciaId, ordem, texto: '', escalaMax: 5, ativo: true,
});

export function CompetenciasEditor({ competencias }: { competencias: Competencia[] }) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [pending, start] = useTransition();

  const [compOpen, setCompOpen] = useState(false);
  const [compEditandoId, setCompEditandoId] = useState<string | null>(null);
  const [compForm, setCompForm] = useState<CompForm>(emptyComp);

  const [fatorOpen, setFatorOpen] = useState(false);
  const [fatorEditandoId, setFatorEditandoId] = useState<string | null>(null);
  const [fatorForm, setFatorForm] = useState<FatorForm>(emptyFator(''));

  const abrirNovaComp = () => {
    setCompEditandoId(null);
    const proximaOrdem = competencias.length
      ? Math.max(...competencias.map((c) => c.ordem)) + 1
      : 0;
    setCompForm({ ...emptyComp, ordem: proximaOrdem });
    setCompOpen(true);
  };

  const abrirEdicaoComp = (c: Competencia) => {
    setCompEditandoId(c.id);
    setCompForm({
      nome: c.nome,
      descricao: c.descricao ?? '',
      ordem: c.ordem,
      peso: Number(c.peso),
      ativo: c.ativo,
    });
    setCompOpen(true);
  };

  const salvarComp = () => {
    if (!compForm.nome.trim()) { toast.error('Nome obrigatório'); return; }
    const payload = {
      nome: compForm.nome.trim(),
      descricao: compForm.descricao.trim() || null,
      ordem: compForm.ordem,
      peso: compForm.peso,
      ativo: compForm.ativo,
    };
    start(async () => {
      try {
        if (compEditandoId) {
          await atualizarCompetencia(compEditandoId, payload);
          toast.success('Competência atualizada');
        } else {
          await criarCompetencia(payload);
          toast.success('Competência criada');
        }
        setCompOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
      }
    });
  };

  const inativarComp = async (c: Competencia) => {
    if (!(await confirmar({ titulo: 'Inativar competência', descricao: `Inativar competência "${c.nome}"? Os fatores não aparecerão em novas avaliações.`, confirmLabel: 'Inativar' }))) return;
    start(async () => {
      try {
        await inativarCompetencia(c.id);
        toast.success('Competência inativada');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro');
      }
    });
  };

  const abrirNovoFator = (c: Competencia) => {
    setFatorEditandoId(null);
    const proximaOrdem = c.fatores.length
      ? Math.max(...c.fatores.map((f) => f.ordem)) + 1
      : 0;
    setFatorForm(emptyFator(c.id, proximaOrdem));
    setFatorOpen(true);
  };

  const abrirEdicaoFator = (f: Fator) => {
    setFatorEditandoId(f.id);
    setFatorForm({
      competenciaId: f.competenciaId,
      ordem: f.ordem,
      texto: f.texto,
      escalaMax: f.escalaMax,
      ativo: f.ativo,
    });
    setFatorOpen(true);
  };

  const salvarFator = () => {
    if (!fatorForm.texto.trim()) { toast.error('Texto do fator obrigatório'); return; }
    const payload = {
      competenciaId: fatorForm.competenciaId,
      ordem: fatorForm.ordem,
      texto: fatorForm.texto.trim(),
      escalaMax: fatorForm.escalaMax,
      ativo: fatorForm.ativo,
    };
    start(async () => {
      try {
        if (fatorEditandoId) {
          await atualizarFator(fatorEditandoId, payload);
          toast.success('Fator atualizado');
        } else {
          await criarFator(payload);
          toast.success('Fator criado');
        }
        setFatorOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
      }
    });
  };

  const inativarFatorAcao = async (f: Fator) => {
    if (!(await confirmar({ titulo: 'Inativar fator', descricao: 'Inativar este fator? Não aparecerá em novas avaliações.', confirmLabel: 'Inativar' }))) return;
    start(async () => {
      try {
        await inativarFator(f.id);
        toast.success('Fator inativado');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-perlog-navy">Competências</h2>
          <p className="text-xs text-perlog-slate">Cada competência contém fatores que serão avaliados de 1 a 5.</p>
        </div>
        <button
          type="button"
          onClick={abrirNovaComp}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium bg-perlog-orange text-white hover:bg-perlog-orange/90"
        >
          <Plus className="h-4 w-4" /> Nova competência
        </button>
      </div>

      <div className="space-y-3">
        {competencias.map((c) => (
          <div
            key={c.id}
            className={`border border-slate-200 rounded-lg ${c.ativo ? '' : 'opacity-50'}`}
          >
            <header className="px-4 py-3 flex items-start justify-between gap-3 border-b border-slate-100">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded bg-perlog-navy/5 text-xs font-mono text-perlog-navy">
                    {c.ordem}
                  </span>
                  <h3 className="text-sm font-semibold text-perlog-navy">{c.nome}</h3>
                  <span className="text-xs text-perlog-slate">peso {Number(c.peso).toFixed(2)}</span>
                  {!c.ativo && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      Inativa
                    </span>
                  )}
                </div>
                {c.descricao && (
                  <p className="text-xs text-perlog-slate mt-1">{c.descricao}</p>
                )}
              </div>
              <div className="inline-flex gap-1 shrink-0">
                <button
                  onClick={() => abrirEdicaoComp(c)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-slate-200 hover:bg-slate-50"
                >
                  <Pencil className="h-3 w-3" /> Editar
                </button>
                <button
                  onClick={() => abrirNovoFator(c)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-slate-200 hover:bg-slate-50"
                >
                  <Plus className="h-3 w-3" /> Fator
                </button>
                {c.ativo && (
                  <button
                    onClick={() => inativarComp(c)}
                    disabled={pending}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <Power className="h-3 w-3" /> Inativar
                  </button>
                )}
              </div>
            </header>

            <div>
              {c.fatores.length === 0 && (
                <div className="px-4 py-4 text-xs text-perlog-slate text-center">
                  Nenhum fator cadastrado.
                </div>
              )}
              {c.fatores.map((f) => (
                <div
                  key={f.id}
                  className={`px-4 py-2 flex items-center gap-3 border-b border-slate-50 last:border-b-0 ${f.ativo ? '' : 'opacity-50'}`}
                >
                  <span className="inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded bg-slate-100 text-xs font-mono text-perlog-slate">
                    {f.ordem}
                  </span>
                  <p className="flex-1 text-sm text-perlog-navy">{f.texto}</p>
                  <span className="text-xs text-perlog-slate">escala 1–{f.escalaMax}</span>
                  {!f.ativo && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                      Inativo
                    </span>
                  )}
                  <div className="inline-flex gap-1">
                    <button
                      onClick={() => abrirEdicaoFator(f)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-slate-200 hover:bg-slate-50"
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </button>
                    {f.ativo && (
                      <button
                        onClick={() => inativarFatorAcao(f)}
                        disabled={pending}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-red-200 text-red-700 hover:bg-red-50"
                      >
                        <Power className="h-3 w-3" /> Inativar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {competencias.length === 0 && (
          <div className="py-12 text-center text-sm text-perlog-slate border border-dashed border-slate-200 rounded-lg">
            Nenhuma competência cadastrada.
          </div>
        )}
      </div>

      {compOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setCompOpen(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200">
            <header className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-perlog-navy">
                  {compEditandoId ? 'Editar competência' : 'Nova competência'}
                </h3>
                <p className="text-xs text-perlog-slate">Agrupamento de fatores na avaliação</p>
              </div>
              <button onClick={() => setCompOpen(false)} aria-label="Fechar">
                <X className="h-4 w-4 text-perlog-slate" />
              </button>
            </header>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-perlog-navy mb-1">Nome *</label>
                <input
                  value={compForm.nome}
                  onChange={(e) => setCompForm({ ...compForm, nome: e.target.value })}
                  autoFocus
                  className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-perlog-navy mb-1">Descrição</label>
                <textarea
                  value={compForm.descricao}
                  onChange={(e) => setCompForm({ ...compForm, descricao: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border border-slate-200 bg-white text-sm px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-perlog-navy mb-1">Ordem</label>
                  <input
                    type="number"
                    value={compForm.ordem}
                    onChange={(e) => setCompForm({ ...compForm, ordem: Number(e.target.value) })}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-perlog-navy mb-1">Peso</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={10}
                    value={compForm.peso}
                    onChange={(e) => setCompForm({ ...compForm, peso: Number(e.target.value) })}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3"
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-perlog-navy">
                    <input
                      type="checkbox"
                      checked={compForm.ativo}
                      onChange={(e) => setCompForm({ ...compForm, ativo: e.target.checked })}
                    />
                    Ativa
                  </label>
                </div>
              </div>
            </div>
            <footer className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50 rounded-b-xl">
              <button onClick={() => setCompOpen(false)} className="px-3 py-1.5 rounded-md text-sm border border-slate-200 hover:bg-white">Cancelar</button>
              <button
                onClick={salvarComp}
                disabled={pending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-perlog-orange text-white hover:bg-perlog-orange/90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {pending ? 'Salvando…' : 'Salvar'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {fatorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setFatorOpen(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200">
            <header className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-perlog-navy">
                  {fatorEditandoId ? 'Editar fator' : 'Novo fator'}
                </h3>
                <p className="text-xs text-perlog-slate">Pergunta avaliada de 1 a {fatorForm.escalaMax}</p>
              </div>
              <button onClick={() => setFatorOpen(false)} aria-label="Fechar">
                <X className="h-4 w-4 text-perlog-slate" />
              </button>
            </header>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-perlog-navy mb-1">Texto *</label>
                <textarea
                  value={fatorForm.texto}
                  onChange={(e) => setFatorForm({ ...fatorForm, texto: e.target.value })}
                  rows={3}
                  autoFocus
                  className="w-full rounded-md border border-slate-200 bg-white text-sm px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-perlog-navy mb-1">Ordem</label>
                  <input
                    type="number"
                    value={fatorForm.ordem}
                    onChange={(e) => setFatorForm({ ...fatorForm, ordem: Number(e.target.value) })}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-perlog-navy mb-1">Escala máx</label>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={fatorForm.escalaMax}
                    onChange={(e) => setFatorForm({ ...fatorForm, escalaMax: Number(e.target.value) })}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3"
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-perlog-navy">
                    <input
                      type="checkbox"
                      checked={fatorForm.ativo}
                      onChange={(e) => setFatorForm({ ...fatorForm, ativo: e.target.checked })}
                    />
                    Ativo
                  </label>
                </div>
              </div>
            </div>
            <footer className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50 rounded-b-xl">
              <button onClick={() => setFatorOpen(false)} className="px-3 py-1.5 rounded-md text-sm border border-slate-200 hover:bg-white">Cancelar</button>
              <button
                onClick={salvarFator}
                disabled={pending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-perlog-orange text-white hover:bg-perlog-orange/90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {pending ? 'Salvando…' : 'Salvar'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
