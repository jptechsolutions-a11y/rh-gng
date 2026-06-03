'use client';
import * as Tabs from '@radix-ui/react-tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import type {
  RelatorioFilialRow,
  RelatorioCompetenciaRow,
  RankingRow,
} from '@/actions/avaliacao';

export function RelatoriosCharts({
  porFilial,
  porComp,
  top,
  bottom,
}: {
  porFilial: RelatorioFilialRow[];
  porComp: RelatorioCompetenciaRow[];
  top: RankingRow[];
  bottom: RankingRow[];
}) {
  const filialData = porFilial.map((r) => ({
    codigo: r.codigo,
    media: Number(r.media ?? 0),
  }));
  const compData = porComp.map((r) => ({
    competencia: r.competencia,
    media: Number(r.media ?? 0),
  }));

  return (
    <Tabs.Root defaultValue="filial">
      <Tabs.List className="flex gap-2 border-b border-slate-200">
        {(
          [
            ['filial', 'Por filial'],
            ['comp', 'Por competência'],
            ['ranking', 'Ranking'],
          ] as const
        ).map(([v, l]) => (
          <Tabs.Trigger
            key={v}
            value={v}
            className="px-3 py-2 text-sm text-perlog-slate data-[state=active]:border-b-2 data-[state=active]:border-perlog-orange data-[state=active]:text-perlog-navy"
          >
            {l}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Tabs.Content value="filial" className="pt-4">
        <Card>
          <CardContent className="h-80 pt-6">
            <ResponsiveContainer>
              <BarChart data={filialData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="codigo" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Bar dataKey="media" fill="#0B2447" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Tabs.Content>

      <Tabs.Content value="comp" className="pt-4">
        <Card>
          <CardContent className="h-80 pt-6">
            <ResponsiveContainer>
              <BarChart data={compData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="competencia" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Bar dataKey="media" fill="#F26B1F" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Tabs.Content>

      <Tabs.Content value="ranking" className="grid gap-4 pt-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-3 font-semibold text-perlog-navy">Top 10</h3>
            <ol className="space-y-1 text-sm">
              {top.map((r, i) => (
                <li key={`${r.matricula}-${i}`}>
                  {i + 1}. {r.avaliado} — <b>{r.media ?? '—'}</b>
                </li>
              ))}
              {top.length === 0 && (
                <p className="text-sm text-perlog-slate">Sem dados.</p>
              )}
            </ol>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-3 font-semibold text-perlog-navy">Bottom 10</h3>
            <ol className="space-y-1 text-sm">
              {bottom.map((r, i) => (
                <li key={`${r.matricula}-${i}`}>
                  {i + 1}. {r.avaliado} — <b>{r.media ?? '—'}</b>
                </li>
              ))}
              {bottom.length === 0 && (
                <p className="text-sm text-perlog-slate">Sem dados.</p>
              )}
            </ol>
          </CardContent>
        </Card>
      </Tabs.Content>
    </Tabs.Root>
  );
}
