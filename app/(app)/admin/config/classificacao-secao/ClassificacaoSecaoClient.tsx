'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  salvarMapeamento,
  excluirMapeamento,
  type MapeamentoSecao,
} from '@/actions/vagas/classificacao-secao';

const selectClass =
  'h-9 rounded-md border border-conecta-primary/15 bg-white text-sm px-2 focus:outline-none focus:ring-2 focus:ring-conecta-accent/30';

export function ClassificacaoSecaoClient({
  mapeamentos,
  naoMapeadas,
  classificacoes,
}: {
  mapeamentos: MapeamentoSecao[];
  naoMapeadas: string[];
  classificacoes: readonly string[];
}) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [pending, start] = useTransition();
  const [novaSecao, setNovaSecao] = useState('');
  const [novaClassificacao, setNovaClassificacao] = useState<string>(classificacoes[0] ?? 'Área de Apoio');

  const adicionar = () => {
    if (!novaSecao) return;
    start(async () => {
      try {
        await salvarMapeamento(novaSecao, novaClassificacao);
        toast.success('Mapeamento adicionado');
        setNovaSecao('');
        setNovaClassificacao(classificacoes[0] ?? 'Área de Apoio');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro');
      }
    });
  };

  const alterarClassificacao = (secao: string, classificacao: string) => {
    start(async () => {
      try {
        await salvarMapeamento(secao, classificacao);
        toast.success('Classificação atualizada');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro');
      }
    });
  };

  const excluir = async (m: MapeamentoSecao) => {
    if (
      !(await confirmar({
        titulo: 'Excluir mapeamento',
        descricao: `A seção "${m.secao}" volta a cair em "Área de Apoio" (padrão).`,
        perigo: true,
        confirmLabel: 'Excluir',
      }))
    )
      return;
    start(async () => {
      try {
        await excluirMapeamento(m.id);
        toast.success('Mapeamento removido');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-conecta-primary font-medium">
          DE-PARA de seção → classificação do Quadro de Vagas
        </p>
        <p className="text-[13px] text-conecta-muted leading-snug">
          Seções sem mapeamento são classificadas como <strong>Área de Apoio</strong> por padrão.
          Cadastre abaixo apenas as exceções (Expansão, Operação, Transporte).
        </p>
      </div>

      {naoMapeadas.length === 0 ? (
        <p className="text-[13px] text-conecta-muted rounded-md border border-conecta-primary/15 bg-slate-50/60 px-3 py-2">
          Todas as seções do sistema já estão mapeadas.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={novaSecao}
            onChange={(e) => setNovaSecao(e.target.value)}
            className={`${selectClass} min-w-[220px] flex-1`}
          >
            <option value="">Selecione a seção…</option>
            {naoMapeadas.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={novaClassificacao}
            onChange={(e) => setNovaClassificacao(e.target.value)}
            className={selectClass}
          >
            {classificacoes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Button type="button" onClick={adicionar} disabled={pending || !novaSecao}>
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      )}

      <p className="text-xs text-conecta-muted">
        {mapeamentos.length} mapeadas · {naoMapeadas.length} sem mapeamento
      </p>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-conecta-primary/15 text-left text-xs uppercase tracking-wide text-conecta-muted">
            <th className="py-2 font-medium">Seção</th>
            <th className="py-2 font-medium w-52">Classificação</th>
            <th className="py-2 font-medium">Atualizado por</th>
            <th className="py-2 font-medium text-right w-20">Ação</th>
          </tr>
        </thead>
        <tbody>
          {mapeamentos.map((m) => (
            <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/60">
              <td className="py-2 pr-2 text-conecta-primary font-medium">{m.secao}</td>
              <td className="py-2 pr-2">
                <select
                  value={m.classificacao}
                  disabled={pending}
                  onChange={(e) => alterarClassificacao(m.secao, e.target.value)}
                  className={`${selectClass} w-full`}
                >
                  {classificacoes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-2 text-conecta-muted">{m.atualizadoPorNome ?? '—'}</td>
              <td className="py-2 text-right">
                <button
                  type="button"
                  onClick={() => excluir(m)}
                  disabled={pending}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </td>
            </tr>
          ))}
          {mapeamentos.length === 0 && (
            <tr>
              <td colSpan={4} className="py-8 text-center text-conecta-muted text-sm">
                Nenhuma seção mapeada. Todas caem em &quot;Área de Apoio&quot;.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
