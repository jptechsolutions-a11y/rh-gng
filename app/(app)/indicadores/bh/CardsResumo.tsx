import type { Resumo } from '@/lib/indicadores/bh-queries';
import { formatBRL, formatHoras } from './variacao';
import { Users, Clock, Wallet, TrendingUp } from 'lucide-react';

function Card({ icon, label, valor }: { icon: React.ReactNode; label: string; valor: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 flex items-start gap-3">
      <div className="rounded-md bg-emerald-50 text-emerald-700 p-2">{icon}</div>
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold">{valor}</div>
      </div>
    </div>
  );
}

export function CardsResumo({ r }: { r: Resumo }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card icon={<Users className="size-5" />}      label="Colaboradores"        valor={r.colaboradores.toLocaleString('pt-BR')} />
      <Card icon={<Clock className="size-5" />}      label="Total de horas"       valor={formatHoras(r.totalHoras)} />
      <Card icon={<Wallet className="size-5" />}     label="Valor a pagar"        valor={formatBRL(r.valorTotal)} />
      <Card icon={<TrendingUp className="size-5" />} label="Média h/colaborador"  valor={formatHoras(r.mediaHoras)} />
    </div>
  );
}
