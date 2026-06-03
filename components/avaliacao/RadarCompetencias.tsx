'use client';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

export function RadarCompetencias({
  data,
}: {
  data: { competencia: string; media: number }[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="competencia" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 5]} tickCount={6} />
          <Radar dataKey="media" stroke="#0B2447" fill="#0B2447" fillOpacity={0.35}>
            <LabelList
              dataKey="media"
              position="top"
              formatter={(v) => Number(v).toFixed(2)}
              style={{ fontSize: 11, fill: '#0B2447', fontWeight: 700 }}
            />
          </Radar>
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
