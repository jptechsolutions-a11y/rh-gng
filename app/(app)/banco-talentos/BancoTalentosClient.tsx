'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ConectaCard } from '@/components/ui/conecta-card';

type Row = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
  cargoPretendido: string | null;
  status: string;
  cidade: string | null;
  dataHora: string;
};

function ageBadge(dataHora: string) {
  const days = Math.floor((Date.now() - new Date(dataHora).getTime()) / 86400000);
  if (days >= 60) return { label: `${days}d · atenção crítica`, cls: 'bg-red-100 text-red-800 border-red-200' };
  if (days >= 30) return { label: `${days}d · atenção`, cls: 'bg-amber-100 text-amber-800 border-amber-200' };
  if (days >= 14) return { label: `${days}d`, cls: 'bg-conecta-primary/8 text-conecta-primary border-conecta-primary/15' };
  return { label: `${days}d · recente`, cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
}

export function BancoTalentosClient({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    const digits = t.replace(/\D/g, '');
    return rows.filter((r) =>
      r.nome.toLowerCase().includes(t)
      || (digits.length >= 3 && r.cpf.includes(digits))
      || (r.cargoPretendido?.toLowerCase().includes(t) ?? false)
    );
  }, [rows, q]);

  return (
    <div className="space-y-5">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-conecta-accent pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, CPF ou cargo..."
          className="pl-9 border-conecta-primary/15 focus-visible:ring-conecta-accent/30 focus-visible:border-conecta-accent"
          aria-label="Buscar no banco de talentos"
        />
      </div>

      <ConectaCard noPadding>
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-conecta-primary/20 mb-3" aria-hidden />
            <p className="font-display font-semibold text-conecta-primary">
              {rows.length === 0
                ? 'Nenhum candidato no banco de talentos'
                : 'Nenhum candidato corresponde ao filtro'}
            </p>
            <p className="text-sm text-conecta-muted mt-1">
              {rows.length === 0
                ? 'Candidatos marcados com este status aparecem aqui.'
                : 'Ajuste sua busca para refinar.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="conecta-table">
              <thead>
                <tr>
                  <th scope="col">Candidato</th>
                  <th scope="col">Cargo</th>
                  <th scope="col">Cidade</th>
                  <th scope="col">Tempo no banco</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const age = ageBadge(e.dataHora);
                  return (
                    <tr key={e.id}>
                      <td>
                        <Link
                          href={`/entrevista/${e.id}`}
                          className="font-display font-semibold text-conecta-primary hover:text-conecta-accent transition-colors"
                        >
                          {e.nome}
                        </Link>
                        <div className="text-xs text-conecta-muted mt-0.5">
                          {e.telefone ?? '—'}
                        </div>
                      </td>
                      <td className="text-conecta-text">{e.cargoPretendido ?? '—'}</td>
                      <td className="text-conecta-muted">{e.cidade ?? '—'}</td>
                      <td>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-display font-semibold border ${age.cls}`}
                        >
                          {age.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ConectaCard>
    </div>
  );
}
