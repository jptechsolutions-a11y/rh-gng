import { requireSession } from '@/lib/auth/session';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';
import { NovoLiderForm } from '@/components/qlp/NovoLiderForm';
import { RemoverLiderButton } from '@/components/qlp/RemoverLiderButton';

export const dynamic = 'force-dynamic';

interface LiderRow {
  id: string;
  tier: string;
  nivel: string | null;
  escopo_nacional: boolean;
  filiais_escopo: string[];
  nome: string;
  funcao: string;
  chapa: string;
  codfilial: number;
  diretos: number;
}

interface FilialRow {
  id: string;
  codigo: string;
  nome: string;
}

export default async function LideresPage() {
  await requireSession('admin');

  const lideres = (await db.execute(sql`
    SELECT
      l.id, l.tier, l.nivel, l.escopo_nacional, l.filiais_escopo,
      c.nome, c.funcao, c.chapa, c.codfilial,
      (SELECT count(*) FROM qlp_vinculos v WHERE v.lider_id = l.id)::int AS diretos
    FROM qlp_lideres l
    JOIN qlp_colaboradores c ON c.id = l.colaborador_id
    WHERE l.ativo
    ORDER BY
      CASE l.tier WHEN 'gerente' THEN 1 WHEN 'subgerente' THEN 2 WHEN 'coord' THEN 3 ELSE 4 END,
      l.nivel,
      c.nome
  `)) as unknown as LiderRow[];

  const filiais = (await db.execute(sql`
    SELECT id, codigo, nome FROM filiais WHERE ativa ORDER BY codigo
  `)) as unknown as FilialRow[];

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Líderes</h1>
          <p className="text-sm text-slate-500 mt-1">
            Espinha hierárquica: gerentes, subgerentes e coordenadores. Apenas admin pode editar.
          </p>
        </div>
        <NovoLiderForm filiais={filiais} />
      </header>

      {lideres.length === 0 ? (
        <p className="text-slate-500 text-sm">
          Nenhum líder cadastrado. Use o botão &quot;+ Novo líder&quot; acima para iniciar.
        </p>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="text-left p-3 font-medium">Nome</th>
                <th className="text-left p-3 font-medium">Função</th>
                <th className="text-left p-3 font-medium">Chapa</th>
                <th className="text-left p-3 font-medium">Tier</th>
                <th className="text-left p-3 font-medium">Nível</th>
                <th className="text-left p-3 font-medium">Escopo</th>
                <th className="text-right p-3 font-medium">Diretos</th>
                <th className="text-right p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lideres.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-900">{l.nome}</td>
                  <td className="p-3 text-slate-700">{l.funcao}</td>
                  <td className="p-3 font-mono text-xs text-slate-600">{l.chapa}</td>
                  <td className="p-3"><Badge>{l.tier}</Badge></td>
                  <td className="p-3 text-slate-700">{l.nivel ?? '—'}</td>
                  <td className="p-3 text-slate-700">
                    {l.escopo_nacional ? (
                      <span className="rounded-full bg-violet-100 text-violet-900 text-xs px-2 py-0.5">
                        Nacional
                      </span>
                    ) : (
                      <span>
                        {(l.filiais_escopo ?? []).length} filial(is)
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right tabular-nums">{l.diretos}</td>
                  <td className="p-3 text-right">
                    <RemoverLiderButton liderId={l.id} nome={l.nome} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-slate-100 text-slate-700 text-xs px-2 py-0.5">
      {children}
    </span>
  );
}
