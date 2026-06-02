'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge, statusVariant } from '@/components/ui/badge';

type Row = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string | null;
  cargoPretendido: string | null;
  status: string;
  cidade: string | null;
};

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
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-perlog-slate pointer-events-none" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, CPF ou cargo..."
          className="pl-9"
          aria-label="Buscar no banco de talentos"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-perlog-slate">
              <Users className="mx-auto h-10 w-10 text-slate-300 mb-3" aria-hidden />
              <p className="font-medium text-perlog-navy">
                {rows.length === 0
                  ? 'Nenhum candidato no banco de talentos'
                  : 'Nenhum candidato corresponde ao filtro'}
              </p>
              <p className="text-sm">
                {rows.length === 0
                  ? 'Candidatos marcados com este status aparecem aqui.'
                  : 'Ajuste sua busca para refinar.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-perlog-slate">
                  <th scope="col" className="px-6 py-3 font-medium">Candidato</th>
                  <th scope="col" className="px-6 py-3 font-medium">Cargo</th>
                  <th scope="col" className="px-6 py-3 font-medium">Status</th>
                  <th scope="col" className="px-6 py-3 font-medium">Cidade</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-6 py-3">
                      <Link href={`/entrevista/${e.id}`} className="font-medium text-perlog-navy hover:text-perlog-orange">
                        {e.nome}
                      </Link>
                      <div className="text-xs text-perlog-slate">{e.telefone ?? '—'}</div>
                    </td>
                    <td className="px-6 py-3 text-perlog-slate">{e.cargoPretendido ?? '—'}</td>
                    <td className="px-6 py-3"><Badge variant={statusVariant(e.status)}>{e.status}</Badge></td>
                    <td className="px-6 py-3 text-perlog-slate">{e.cidade ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
