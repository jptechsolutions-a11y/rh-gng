'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatHoras } from './variacao';

const COLORS = ['#059669', '#0ea5e9', '#22c55e', '#0284c7', '#10b981'];

export function RoscaTop5({ titulo, dados }: { titulo: string; dados: Array<{ label: string; valor: number }> }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="font-medium mb-3">{titulo}</h3>
      {dados.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">Sem dados</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={dados} dataKey="valor" nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {dados.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatHoras(Number(v))} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
