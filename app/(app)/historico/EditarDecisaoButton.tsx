'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { atualizarDecisao } from '@/actions/entrevistas';

type Props = {
  entrevistaId: string;
  candidatoNome: string;
  status: string;
  gestorAprovador?: string | null;
  motivoDecisao?: string | null;
  dataRetorno?: string | Date | null;
  aprovadoPeloGg?: boolean | null;
};

const STATUS_OPTIONS = ['Em análise', 'Aprovado', 'Reprovado', 'Banco de Talentos', 'Contratado'];

const MOTIVOS_TEMPLATES = {
  Aprovado: [
    'Perfil aderente ao cargo e à rotina operacional',
    'Boas referências e disponibilidade total',
    'Experiência prévia compatível e bom alinhamento com a equipe',
    'Indicado por colaborador interno, perfil compatível',
  ],
  Reprovado: [
    'Pretensão salarial acima da faixa do cargo',
    'Falta de aderência à rotina operacional / escala',
    'Distância / dificuldade de deslocamento',
    'Experiência insuficiente para a vaga',
    'Postura inadequada durante a entrevista',
    'Histórico de instabilidade profissional (turnover alto)',
  ],
  'Banco de Talentos': [
    'Bom perfil, sem vaga aberta no momento',
    'Aguardando abertura de vaga compatível',
  ],
  'Em análise': [
    'Aguardando segunda entrevista com gestor',
    'Aguardando documentação complementar',
  ],
  Contratado: [
    'Contratado após aprovação do gestor',
  ],
} as const;

export function EditarDecisaoButton(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const [status, setStatus] = useState(props.status);
  const [gestor, setGestor] = useState(props.gestorAprovador ?? '');
  const [motivo, setMotivo] = useState(props.motivoDecisao ?? '');
  const [retorno, setRetorno] = useState(
    props.dataRetorno
      ? (typeof props.dataRetorno === 'string' ? props.dataRetorno : new Date(props.dataRetorno).toISOString().slice(0, 10))
      : ''
  );
  const [aprovGg, setAprovGg] = useState(Boolean(props.aprovadoPeloGg));

  const isDecisaoFinal = status === 'Aprovado' || status === 'Reprovado';
  const podeSalvar = !isDecisaoFinal || gestor.trim().length >= 2;

  const reset = () => {
    setStatus(props.status);
    setGestor(props.gestorAprovador ?? '');
    setMotivo(props.motivoDecisao ?? '');
    setRetorno(props.dataRetorno ? (typeof props.dataRetorno === 'string' ? props.dataRetorno : new Date(props.dataRetorno).toISOString().slice(0, 10)) : '');
    setAprovGg(Boolean(props.aprovadoPeloGg));
  };

  const submit = () => {
    if (!podeSalvar) {
      toast.error('Informe o gestor que aprovou/reprovou');
      return;
    }
    start(async () => {
      try {
        await atualizarDecisao({
          entrevistaId: props.entrevistaId,
          status,
          gestorAprovador: gestor.trim() || undefined,
          motivoDecisao: motivo.trim() || undefined,
          dataRetorno: retorno || undefined,
          aprovadoPeloGg: aprovGg,
        });
        toast.success('Decisão atualizada');
        setOpen(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao atualizar');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { reset(); setOpen(true); }}
        title="Editar decisão"
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-slate-200 hover:bg-slate-50 text-perlog-navy"
      >
        <Pencil className="h-3.5 w-3.5" /> Editar decisão
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200">
            <header className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-perlog-navy">Editar decisão</h3>
                <p className="text-xs text-perlog-slate">{props.candidatoNome}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-perlog-slate hover:text-perlog-navy" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-perlog-navy mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <label className="flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aprovGg}
                  onChange={(e) => setAprovGg(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-perlog-orange focus:ring-perlog-orange/40"
                />
                <span className="text-xs text-perlog-navy">
                  <span className="font-semibold block">Avaliado pelo Gente &amp; Gestão</span>
                  <span className="text-perlog-slate">Marque se o G&amp;G fez a avaliação inicial.</span>
                </span>
              </label>

              {isDecisaoFinal && (
                <div className="rounded-md border border-perlog-orange/30 bg-perlog-orange/5 p-3 space-y-2">
                  <label className="block text-xs font-medium text-perlog-navy">
                    {status === 'Aprovado' ? 'Gestor que aprovou' : 'Gestor que reprovou'} *
                  </label>
                  <input
                    type="text"
                    value={gestor}
                    onChange={(e) => setGestor(e.target.value)}
                    placeholder="Nome do gestor responsável"
                    className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-perlog-navy mb-1">Motivo da decisão</label>
                {(MOTIVOS_TEMPLATES[status as keyof typeof MOTIVOS_TEMPLATES] ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {(MOTIVOS_TEMPLATES[status as keyof typeof MOTIVOS_TEMPLATES] ?? []).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMotivo((m) => m ? `${m}\n${t}` : t)}
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium border border-slate-200 bg-slate-50 hover:bg-perlog-orange/10 hover:border-perlog-orange/30 text-perlog-navy"
                      >
                        + {t}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-slate-200 bg-white text-sm px-3 py-2"
                  placeholder="Justificativa da decisão (use os templates acima ou escreva livre)"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-perlog-navy mb-1">Data de retorno ao candidato</label>
                <input
                  type="date"
                  value={retorno}
                  onChange={(e) => setRetorno(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3"
                />
              </div>
            </div>

            <footer className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50 rounded-b-xl">
              <p className="text-[11px] text-perlog-slate">
                Apenas campos de decisão são alterados. Dados da entrevista permanecem intactos.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 rounded-md text-sm border border-slate-200 hover:bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={pending || !podeSalvar}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-perlog-orange text-white hover:bg-perlog-orange/90 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {pending ? 'Salvando…' : 'Salvar decisão'}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
