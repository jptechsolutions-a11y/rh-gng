'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import { Activity } from 'lucide-react';

const COLORS = ['#0D2B6B', '#E8621A', '#1A3F8F', '#F59E45', '#3E5BA9'];

export function RoscaTop5Inconsist({
  titulo, dados,
}: {
  titulo: string;
  dados: Array<{ label: string; valor: number; pct: number }>;
}) {
  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-2">
        <SectionHeader label={titulo} icon={Activity} />
      </div>
      {dados.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-conecta-muted">Sem dados</p>
      ) : (
        <div className="h-72 px-2 pb-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={dados} dataKey="valor" nameKey="label" innerRadius={55} outerRadius={92} paddingAngle={2}>
                {dados.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={2} />)}
              </Pie>
              <Tooltip
                formatter={(v, _name, p) => {
                  const pct = (p?.payload as { pct?: number } | undefined)?.pct;
                  return [`${v} (${pct ?? 0}%)`, 'Inconsistências'];
                }}
                contentStyle={{
                  border: '1px solid rgba(13,43,107,0.12)',
                  borderRadius: 8,
                  boxShadow: '0 4px 24px -10px rgba(13,43,107,0.25)',
                  fontFamily: 'inherit',
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={42}
                wrapperStyle={{ fontSize: 12, fontFamily: 'inherit', color: '#475569' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </ConectaCard>
  );
}
