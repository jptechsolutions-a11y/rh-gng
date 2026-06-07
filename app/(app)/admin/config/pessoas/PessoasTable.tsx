'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Power, X, Save, Search } from 'lucide-react';
import { criarPessoa, atualizarPessoa, inativarPessoa } from '@/actions/avaliacao-admin';
import { useConfirm } from '@/components/ui/confirm-dialog';

type Filial = { id: string; codigo: string; nome: string };

type Pessoa = {
  id: string;
  matricula: string;
  nome: string;
  funcao: string | null;
  filialId: string | null;
  regional: string | null;
  isColaborador: boolean;
  isGestor: boolean;
  ativo: boolean;
};

type FormState = {
  matricula: string;
  nome: string;
  funcao: string;
  filialId: string;
  regional: string;
  isColaborador: boolean;
  isGestor: boolean;
  ativo: boolean;
};

const emptyForm: FormState = {
  matricula: '', nome: '', funcao: '', filialId: '', regional: '',
  isColaborador: true, isGestor: false, ativo: true,
};

type FiltrosUI = { busca: string; filialId: string; tipo: string; ativo: string };

export function PessoasTable({
  pessoas, filiais, filtrosIniciais,
}: { pessoas: Pessoa[]; filiais: Filial[]; filtrosIniciais: FiltrosUI }) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [pending, start] = useTransition();
  const [filtros, setFiltros] = useState<FiltrosUI>(filtrosIniciais);

  const [open, setOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const aplicarFiltros = (proximos: FiltrosUI) => {
    const params = new URLSearchParams();
    if (proximos.busca) params.set('busca', proximos.busca);
    if (proximos.filialId) params.set('filialId', proximos.filialId);
    if (proximos.tipo) params.set('tipo', proximos.tipo);
    if (proximos.ativo) params.set('ativo', proximos.ativo);
    const qs = params.toString();
    router.push(`/admin/config/pessoas${qs ? `?${qs}` : ''}`);
  };

  const filialNome = (id: string | null) => {
    if (!id) return '—';
    const f = filiais.find((x) => x.id === id);
    return f ? `${f.codigo} · ${f.nome}` : '—';
  };

  const tipoBadge = (p: Pessoa) => {
    const ambos = p.isColaborador && p.isGestor;
    const label = ambos ? 'Ambos' : p.isGestor ? 'Gestor' : 'Colaborador';
    const cls = ambos
      ? 'bg-violet-100 text-violet-800'
      : p.isGestor
        ? 'bg-amber-100 text-amber-800'
        : 'bg-sky-100 text-sky-800';
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
  };

  const abrirNova = () => {
    setEditandoId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const abrirEdicao = (p: Pessoa) => {
    setEditandoId(p.id);
    setForm({
      matricula: p.matricula,
      nome: p.nome,
      funcao: p.funcao ?? '',
      filialId: p.filialId ?? '',
      regional: p.regional ?? '',
      isColaborador: p.isColaborador,
      isGestor: p.isGestor,
      ativo: p.ativo,
    });
    setOpen(true);
  };

  const salvar = () => {
    if (!form.matricula.trim()) { toast.error('Matrícula obrigatória'); return; }
    if (!form.nome.trim()) { toast.error('Nome obrigatório'); return; }
    if (!form.isColaborador && !form.isGestor) {
      toast.error('Selecione ao menos um tipo (colaborador ou gestor)');
      return;
    }
    const payload = {
      matricula: form.matricula.trim(),
      nome: form.nome.trim(),
      funcao: form.funcao.trim() || null,
      filialId: form.filialId || null,
      regional: form.regional.trim() || null,
      isColaborador: form.isColaborador,
      isGestor: form.isGestor,
      ativo: form.ativo,
    };
    start(async () => {
      try {
        if (editandoId) {
          await atualizarPessoa(editandoId, payload);
          toast.success('Pessoa atualizada');
        } else {
          await criarPessoa(payload);
          toast.success('Pessoa criada');
        }
        setOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
      }
    });
  };

  const inativar = async (p: Pessoa) => {
    if (!(await confirmar({ titulo: 'Inativar pessoa', descricao: `Inativar "${p.nome}"? A pessoa não aparecerá em novas avaliações.`, confirmLabel: 'Inativar' }))) return;
    start(async () => {
      try {
        await inativarPessoa(p.id);
        toast.success('Pessoa inativada');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-perlog-navy mb-1">Buscar por nome</label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-perlog-slate" />
            <input
              value={filtros.busca}
              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') aplicarFiltros(filtros); }}
              placeholder="Nome..."
              className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm pl-8 pr-3"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-perlog-navy mb-1">Filial</label>
          <select
            value={filtros.filialId}
            onChange={(e) => { const novo = { ...filtros, filialId: e.target.value }; setFiltros(novo); aplicarFiltros(novo); }}
            className="h-9 rounded-md border border-slate-200 bg-white text-sm px-2"
          >
            <option value="">Todas</option>
            {filiais.map((f) => <option key={f.id} value={f.id}>{f.codigo} · {f.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-perlog-navy mb-1">Tipo</label>
          <select
            value={filtros.tipo}
            onChange={(e) => { const novo = { ...filtros, tipo: e.target.value }; setFiltros(novo); aplicarFiltros(novo); }}
            className="h-9 rounded-md border border-slate-200 bg-white text-sm px-2"
          >
            <option value="">Todos</option>
            <option value="colaborador">Colaborador</option>
            <option value="gestor">Gestor</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-perlog-navy mb-1">Status</label>
          <select
            value={filtros.ativo}
            onChange={(e) => { const novo = { ...filtros, ativo: e.target.value }; setFiltros(novo); aplicarFiltros(novo); }}
            className="h-9 rounded-md border border-slate-200 bg-white text-sm px-2"
          >
            <option value="">Todos</option>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => aplicarFiltros(filtros)}
          className="h-9 px-3 rounded-md text-sm border border-slate-200 hover:bg-slate-50"
        >
          Aplicar
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={abrirNova}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium bg-perlog-orange text-white hover:bg-perlog-orange/90"
        >
          <Plus className="h-4 w-4" /> Nova pessoa
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-perlog-slate">
            <th className="py-2 font-medium">Matrícula</th>
            <th className="py-2 font-medium">Nome</th>
            <th className="py-2 font-medium">Função</th>
            <th className="py-2 font-medium">Filial</th>
            <th className="py-2 font-medium">Regional</th>
            <th className="py-2 font-medium">Tipo</th>
            <th className="py-2 font-medium w-20">Status</th>
            <th className="py-2 font-medium text-right w-44">Ações</th>
          </tr>
        </thead>
        <tbody>
          {pessoas.map((p) => (
            <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/60">
              <td className="py-2 pr-2 font-mono text-perlog-navy">{p.matricula}</td>
              <td className="py-2 pr-2 text-perlog-navy font-medium">{p.nome}</td>
              <td className="py-2 pr-2 text-perlog-slate">{p.funcao ?? '—'}</td>
              <td className="py-2 pr-2 text-perlog-slate">{filialNome(p.filialId)}</td>
              <td className="py-2 pr-2 text-perlog-slate">{p.regional ?? '—'}</td>
              <td className="py-2 pr-2">{tipoBadge(p)}</td>
              <td className="py-2 pr-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                  {p.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td className="py-2 text-right">
                <div className="inline-flex gap-1">
                  <button onClick={() => abrirEdicao(p)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-slate-200 hover:bg-slate-50">
                    <Pencil className="h-3 w-3" />Editar
                  </button>
                  {p.ativo && (
                    <button onClick={() => inativar(p)} disabled={pending} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-red-200 text-red-700 hover:bg-red-50">
                      <Power className="h-3 w-3" />Inativar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {pessoas.length === 0 && (
            <tr><td colSpan={8} className="py-8 text-center text-perlog-slate text-sm">Nenhuma pessoa encontrada.</td></tr>
          )}
        </tbody>
      </table>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200">
            <header className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-perlog-navy">{editandoId ? 'Editar pessoa' : 'Nova pessoa'}</h3>
                <p className="text-xs text-perlog-slate">Cadastro para avaliação de desempenho</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fechar"><X className="h-4 w-4 text-perlog-slate" /></button>
            </header>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-perlog-navy mb-1">Matrícula *</label>
                  <input
                    value={form.matricula}
                    onChange={(e) => setForm({ ...form, matricula: e.target.value })}
                    autoFocus
                    className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-perlog-navy mb-1">Regional</label>
                  <input
                    value={form.regional}
                    onChange={(e) => setForm({ ...form, regional: e.target.value })}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-perlog-navy mb-1">Nome *</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-perlog-navy mb-1">Função</label>
                  <input
                    value={form.funcao}
                    onChange={(e) => setForm({ ...form, funcao: e.target.value })}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-perlog-navy mb-1">Filial</label>
                  <select
                    value={form.filialId}
                    onChange={(e) => setForm({ ...form, filialId: e.target.value })}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-2"
                  >
                    <option value="">— Nenhuma —</option>
                    {filiais.map((f) => <option key={f.id} value={f.id}>{f.codigo} · {f.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="inline-flex items-center gap-2 text-sm text-perlog-navy">
                  <input type="checkbox" checked={form.isColaborador} onChange={(e) => setForm({ ...form, isColaborador: e.target.checked })} />
                  Colaborador
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-perlog-navy">
                  <input type="checkbox" checked={form.isGestor} onChange={(e) => setForm({ ...form, isGestor: e.target.checked })} />
                  Gestor
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-perlog-navy">
                  <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
                  Ativo
                </label>
              </div>
            </div>
            <footer className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50 rounded-b-xl">
              <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-md text-sm border border-slate-200 hover:bg-white">Cancelar</button>
              <button
                onClick={salvar}
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
