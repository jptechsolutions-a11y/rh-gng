'use client';

import { useState, useEffect } from 'react';
import { listarRotas, statsTransporte, listarNaoAlocados } from '@/actions/transporte';
import { Bus, Users, MapPin, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

type Filial = { id: string; codigo: string; nome: string };
type Rota = { id: string; nome: string; turno: string; lugares: number; passageiros: number; ativo: boolean };
type Stats = {
  totalRotas: number;
  totalLugares: number;
  totalPassageiros: number;
  ocupacao: number;
  porTurno: Record<string, { rotas: number; lugares: number; passageiros: number }>;
};

export function TransporteOverviewClient({
  perfil,
  filialId: initialFilialId,
  filiais,
}: {
  perfil: string;
  filialId?: string;
  filiais: Filial[];
}) {
  const isAdmin = perfil === 'admin';
  const [filialId, setFilialId] = useState(initialFilialId ?? filiais[0]?.id ?? '');
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [naoAlocados, setNaoAlocados] = useState(0);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    if (!filialId) { setLoading(false); return; }
    setLoading(true);
    try {
      const fid = isAdmin ? filialId : undefined;
      const [r, s, na] = await Promise.all([
        listarRotas(fid),
        statsTransporte(fid),
        listarNaoAlocados(fid),
      ]);
      setRotas(r as Rota[]);
      setStats(s);
      setNaoAlocados(na.length);
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [filialId]);

  const turno1 = rotas.filter(r => r.turno === '1º Turno' && r.ativo);
  const turno2 = rotas.filter(r => r.turno === '2º Turno' && r.ativo);

  return (
    <div className="space-y-6 p-6">
      {/* Admin filial selector */}
      {isAdmin && filiais.length > 0 && (
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-xs">
            <label className="block text-xs font-medium text-conecta-primary mb-1">Filial</label>
            <select
              value={filialId}
              onChange={e => setFilialId(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-3"
            >
              {filiais.map(f => (
                <option key={f.id} value={f.id}>{f.codigo} — {f.nome}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isAdmin && filiais.length === 0 && (
        <div className="bg-white rounded-xl border border-conecta-primary/8 p-6 text-center text-conecta-muted">
          <Bus className="h-10 w-10 mx-auto mb-3 text-conecta-accent" />
          <p className="text-sm">Nenhuma filial com o módulo Transporte ativo.</p>
          <p className="text-xs mt-1">Ative em Configuração &rarr; Módulos por filial.</p>
        </div>
      )}

      {loading ? (
        <div className="text-center text-conecta-muted py-8 text-sm">Carregando...</div>
      ) : (
        <>
          {/* Banner não alocados */}
          {naoAlocados > 0 && (
            <Link
              href="/transporte/passageiros"
              className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100/60 transition-colors"
            >
              <div className="grid place-items-center h-9 w-9 rounded-lg bg-amber-500 text-white">
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">{naoAlocados} passageiro(s) sem rota</p>
                <p className="text-xs text-amber-700">Clique para alocar a uma rota</p>
              </div>
            </Link>
          )}

          {/* Stats cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Rotas ativas" value={stats.totalRotas} icon={<MapPin className="h-5 w-5" />} />
              <StatCard label="Lugares totais" value={stats.totalLugares} icon={<Bus className="h-5 w-5" />} />
              <StatCard label="Passageiros alocados" value={stats.totalPassageiros} icon={<Users className="h-5 w-5" />} />
              <StatCard label="Ocupação" value={`${stats.ocupacao}%`} icon={<Bus className="h-5 w-5" />} accent />
            </div>
          )}

          {/* 1º Turno */}
          {turno1.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold text-conecta-primary mb-3 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-conecta-accent" />
                1º Turno
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {turno1.map(r => <RotaCard key={r.id} rota={r} />)}
              </div>
            </section>
          )}

          {/* 2º Turno */}
          {turno2.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold text-conecta-primary mb-3 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-conecta-primary" />
                2º Turno
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {turno2.map(r => <RotaCard key={r.id} rota={r} />)}
              </div>
            </section>
          )}

          {rotas.length === 0 && filialId && (
            <div className="bg-white rounded-xl border border-conecta-primary/8 p-8 text-center text-conecta-muted">
              <Bus className="h-10 w-10 mx-auto mb-3 text-conecta-accent/50" />
              <p className="text-sm">Nenhuma rota cadastrada para esta filial.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: string | number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-conecta-primary/8 p-4" style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.08)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className={accent ? 'text-conecta-accent' : 'text-conecta-primary/60'}>{icon}</span>
      </div>
      <div className={`font-display text-2xl font-extrabold ${accent ? 'text-conecta-accent' : 'text-conecta-primary'}`}>
        {value}
      </div>
      <div className="text-xs text-conecta-muted mt-0.5">{label}</div>
    </div>
  );
}

function RotaCard({ rota }: { rota: { id: string; nome: string; turno: string; lugares: number; passageiros: number } }) {
  const pct = rota.lugares > 0 ? Math.round((rota.passageiros / rota.lugares) * 100) : 0;
  return (
    <div className="bg-white rounded-xl border border-conecta-primary/8 p-4" style={{ boxShadow: '0 4px 24px -10px rgba(13,43,107,0.08)' }}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-sm font-bold text-conecta-primary truncate">{rota.nome}</h3>
        <span className="text-[11px] font-medium text-conecta-muted bg-slate-100 px-2 py-0.5 rounded-full shrink-0 ml-2">
          {rota.turno}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-conecta-muted mb-2">
        <span>{rota.passageiros}/{rota.lugares} lugares</span>
        <span className="font-semibold text-conecta-primary">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: pct >= 90 ? '#ef4444' : pct >= 70 ? '#E8621A' : '#0D2B6B',
          }}
        />
      </div>
    </div>
  );
}
