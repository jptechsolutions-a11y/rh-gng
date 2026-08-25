'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, LabelList } from 'recharts';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';

export function VagasAbertoPorFilialChart({ data }: { data: { filial: string; total: number }[] }) {
  return (
    <ConectaCard>
      <SectionHeader label="Vagas em aberto por filial" />
      <div className="h-72 w-full mt-3">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="filial" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="total" fill="#0D2B6B">
              <LabelList dataKey="total" position="top" style={{ fontSize: 11, fill: '#0D2B6B', fontWeight: 700 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ConectaCard>
  );
}
