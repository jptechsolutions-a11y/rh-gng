'use client';

import { useState, useTransition } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge, statusVariant } from '@/components/ui/badge';
import { buscaGlobal } from '@/actions/entrevistas';

type Row = Awaited<ReturnType<typeof buscaGlobal>>[number];

export function BuscaGlobalClient() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const run = () => {
    setErro(null);
    startTransition(async () => {
      try {
        setRows(await buscaGlobal(q));
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro');
      }
    });
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-conecta-accent pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome, CPF ou e-mail..."
            className="pl-9 border-conecta-primary/15 focus-visible:ring-conecta-accent/30 focus-visible:border-conecta-accent"
          />
        </div>
        <button
          type="submit"
          disabled={pending || q.trim().length < 2}
          className="conecta-btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {erro && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          {erro}
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="conecta-table">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">CPF</th>
                <th scope="col">Status</th>
                <th scope="col">Data</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="font-display font-semibold text-conecta-primary">
                      {r.nome}
                    </span>
                  </td>
                  <td className="text-conecta-muted font-mono text-xs">{r.cpf}</td>
                  <td>
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                  </td>
                  <td className="text-conecta-muted text-xs">
                    {new Date(r.dataHora).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
