'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, LabelList } from 'recharts';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';

export function VagasPorStatusChart({ data }: { data: { status: string; total: number }[] }) {
  return (
    <ConectaCard>
      <SectionHeader label="Vagas por status" />
      <div className="h-72 w-full mt-3">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="total" fill="#E8621A">
              <LabelList dataKey="total" position="top" style={{ fontSize: 11, fill: '#0D2B6B', fontWeight: 700 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ConectaCard>
  );
}
