'use client';

import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import Link from 'next/link';
import { AlertTriangle, X, History } from 'lucide-react';
import { listarPorCpfMesmaFilial } from '@/actions/entrevistas';
import type { EntrevistaInput } from '@/lib/validators';

type Existente = {
  id: string;
  nome: string;
  status: string;
  cargoPretendido: string | null;
  dataHora: Date | string;
};

export function CpfDuplicateAlert({ entrevistaIdAtual }: { entrevistaIdAtual?: string }) {
  const { watch } = useFormContext<EntrevistaInput>();
  const cpf = watch('cpf');
  const [existentes, setExistentes] = useState<Existente[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const digits = (cpf ?? '').replace(/\D/g, '');
    if (digits.length !== 11) {
      setExistentes([]);
      return;
    }
    setDismissed(false);
    let cancel = false;
    listarPorCpfMesmaFilial(digits, entrevistaIdAtual).then((rows) => {
      if (!cancel) setExistentes(rows as Existente[]);
    }).catch(() => {});
    return () => { cancel = true; };
  }, [cpf, entrevistaIdAtual]);

  if (dismissed || existentes.length === 0) return null;

  const cpfDigits = (cpf ?? '').replace(/\D/g, '');

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-amber-900">
              Esse CPF já foi entrevistado nesta filial ({existentes.length} {existentes.length === 1 ? 'entrevista' : 'entrevistas'})
            </p>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-amber-700 hover:text-amber-900"
              aria-label="Fechar alerta"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="text-xs text-amber-900 space-y-1">
            {existentes.slice(0, 5).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{e.nome}</span>
                <span className="text-amber-700">·</span>
                <span>{e.cargoPretendido ?? '—'}</span>
                <span className="text-amber-700">·</span>
                <span>{new Date(e.dataHora).toLocaleDateString('pt-BR')}</span>
                <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-200 text-amber-900">
                  {e.status}
                </span>
                <Link href={`/entrevista/${e.id}`} className="text-perlog-navy underline hover:text-perlog-orange">
                  abrir
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href={`/candidato/${cpfDigits}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-amber-400 bg-white text-amber-900 hover:bg-amber-100"
            >
              <History className="h-3.5 w-3.5" /> Ver histórico do candidato
            </Link>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-600 text-white hover:bg-amber-700"
            >
              Prosseguir mesmo assim com nova entrevista
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
