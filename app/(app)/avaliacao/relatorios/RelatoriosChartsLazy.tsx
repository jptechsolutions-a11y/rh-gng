'use client';

// Wrapper client-only para que o bundle do recharts não entre no chunk
// inicial da rota. ssr:false é proibido fora de client components no Next 15.
import dynamic from 'next/dynamic';

export const RelatoriosCharts = dynamic(
  () => import('./RelatoriosCharts').then((m) => m.RelatoriosCharts),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 w-full animate-pulse rounded-lg bg-slate-100" />
    ),
  },
);
