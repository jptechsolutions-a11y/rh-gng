'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { toggleModuloFilial } from '@/actions/modulos';
import { Bus } from 'lucide-react';

type Filial = { id: string; codigo: string; nome: string; ativa: boolean; modulos: string[] };

const MODULO_LABELS: Record<string, { label: string; icon: typeof Bus }> = {
  transporte: { label: 'Transporte', icon: Bus },
};

export function ModulosClient({
  filiais,
  modulosDisponiveis,
}: {
  filiais: Filial[];
  modulosDisponiveis: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const toggle = (filialId: string, slug: string, ativo: boolean) => {
    start(async () => {
      try {
        await toggleModuloFilial(filialId, slug, ativo);
        toast.success(`${MODULO_LABELS[slug]?.label ?? slug} ${ativo ? 'ativado' : 'desativado'}`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro');
      }
    });
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-conecta-primary/8 overflow-hidden"
        style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.08)' }}>
        <div className="px-6 py-3 border-b border-slate-100">
          <p className="text-sm text-conecta-muted">{filiais.length} filiais · {modulosDisponiveis.length} módulo(s) configurável(is)</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-conecta-muted">
              <th className="px-6 py-3 font-medium">Código</th>
              <th className="px-6 py-3 font-medium">Nome</th>
              <th className="px-6 py-3 font-medium">Status</th>
              {modulosDisponiveis.map(slug => {
                const cfg = MODULO_LABELS[slug];
                const Icon = cfg?.icon ?? Bus;
                return (
                  <th key={slug} className="px-6 py-3 font-medium text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-conecta-accent" />
                      {cfg?.label ?? slug}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filiais.map(f => (
              <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-6 py-3 font-mono text-conecta-primary font-semibold">{f.codigo}</td>
                <td className="px-6 py-3 text-conecta-primary">{f.nome}</td>
                <td className="px-6 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    f.ativa ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {f.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                {modulosDisponiveis.map(slug => {
                  const ativo = f.modulos.includes(slug);
                  return (
                    <td key={slug} className="px-6 py-3 text-center">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => toggle(f.id, slug, !ativo)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          ativo ? 'bg-conecta-accent' : 'bg-slate-200'
                        } ${pending ? 'opacity-50' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                            ativo ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
