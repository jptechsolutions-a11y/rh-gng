import Link from 'next/link';
import { getSession } from '@/lib/auth/session';
import { getKPIs } from '@/db/queries/qlp';

export const dynamic = 'force-dynamic';

export default async function QlpHome() {
  const s = await getSession();
  const filialId = s?.perfil === 'filial' ? s.filialId : null;
  const k = await getKPIs(filialId);

  const cobertura = k.totalAtivos > 0 ? Math.round((k.comLider / k.totalAtivos) * 100) : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">QLP &amp; Liderança</h1>
        <p className="text-sm text-slate-500 mt-1">
          {s?.perfil === 'filial'
            ? `Visão da filial ${s.filialCodigo}`
            : 'Visão geral · todas as filiais'}
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Colaboradores ativos" value={k.totalAtivos} tone="slate" />
        <Card
          title="Com líder"
          value={`${k.comLider} / ${k.totalAtivos}`}
          hint={`${cobertura}% de cobertura`}
          tone={cobertura >= 80 ? 'emerald' : cobertura >= 50 ? 'amber' : 'rose'}
        />
        <Card title="Pendências abertas" value={k.pendenciasAbertas} tone={k.pendenciasAbertas > 0 ? 'amber' : 'slate'} />
        <Card
          title="Último sync"
          value={k.ultimoSync ? k.ultimoSync.toLocaleString('pt-BR') : '—'}
          tone="slate"
        />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <Atalho href="/qlp/quadro" titulo="Quadro" sub="Lista de colaboradores e atribuição de líderes" />
        <Atalho href="/qlp/organograma" titulo="Organograma" sub="Estrutura visual dos líderes" />
        <Atalho href="/qlp/historico" titulo="Histórico" sub="Auditoria de todas as movimentações" />
        {s?.perfil === 'admin' && (
          <>
            <Atalho href="/qlp/lideres" titulo="Líderes" sub="Gerenciar gerentes, subgerentes e coords" />
            <Atalho href="/qlp/cargos" titulo="Cargos" sub="Revisar classificação das funções" />
            <Atalho href="/qlp/importar" titulo="Importar XLS" sub="Sync do Quadro Perlog" />
          </>
        )}
      </section>
    </div>
  );
}

function Card({
  title,
  value,
  hint,
  tone,
}: {
  title: string;
  value: string | number;
  hint?: string;
  tone: 'slate' | 'emerald' | 'amber' | 'rose';
}) {
  const toneClass: Record<typeof tone, string> = {
    slate: 'bg-white border-slate-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    amber: 'bg-amber-50 border-amber-200',
    rose: 'bg-rose-50 border-rose-200',
  };
  return (
    <div className={`rounded-2xl border p-4 ${toneClass[tone]}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-1">{hint}</div>}
    </div>
  );
}

function Atalho({ href, titulo, sub }: { href: string; titulo: string; sub: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 hover:border-slate-300 transition-colors block"
    >
      <div className="text-sm font-semibold text-slate-900">{titulo}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </Link>
  );
}
