import { BarChart3, Briefcase, CalendarDays, Clock, Layers, Map, Users } from 'lucide-react';
import { ConectaCard, SectionHeader } from '@/components/ui/conecta-card';
import type { IndicadoresEscalas } from '@/db/queries/qlp-escalas';
import { DIAS_SEMANA, contarPorDia, formatarDias, pivotar, type LinhaCruzamento } from '@/lib/qlp/escala';
import { SEM_TURNO, TURNOS } from '@/lib/qlp/turno';

/** Ordem fixa das linhas da tabela de turnos. */
const ORDEM_TURNOS: readonly string[] = [...TURNOS.map((t) => t.rotulo), SEM_TURNO];

const LIMITE_LINHAS = 15;

/** Percentual inteiro; "<1" quando há alguém mas arredonda para zero. */
function pct(parte: number, todo: number): string {
  if (todo <= 0 || parte <= 0) return '0';
  const v = Math.round((parte / todo) * 100);
  return v === 0 ? '<1' : String(v);
}

function Kpi({
  rotulo,
  valor,
  detalhe,
  alerta = false,
}: {
  rotulo: string;
  valor: number | string;
  detalhe?: string;
  alerta?: boolean;
}) {
  return (
    <ConectaCard variant={alerta ? 'orange' : 'navy'}>
      <div className="text-[10px] font-display font-semibold uppercase tracking-[0.2em] text-conecta-muted">
        {rotulo}
      </div>
      <div
        className={`mt-1 font-display text-3xl font-extrabold tabular-nums ${
          alerta ? 'text-conecta-accent' : 'text-conecta-primary'
        }`}
      >
        {valor}
      </div>
      {detalhe && <div className="mt-0.5 text-[12px] text-conecta-muted">{detalhe}</div>}
    </ConectaCard>
  );
}

function BarraLinha({
  rotulo,
  detalhe,
  qtd,
  max,
  total,
  cor = 'linear-gradient(90deg, #0D2B6B 0%, #1A3F8F 100%)',
}: {
  rotulo: string;
  detalhe?: string;
  qtd: number;
  max: number;
  total: number;
  cor?: string;
}) {
  return (
    <tr className="border-b border-conecta-primary/5 last:border-b-0">
      <td className="w-52 py-2 pr-3">
        <div className="font-display text-[13px] font-semibold text-conecta-primary">{rotulo}</div>
        {detalhe && <div className="text-[11px] text-conecta-muted">{detalhe}</div>}
      </td>
      <td className="py-2">
        <div className="h-2 overflow-hidden rounded-full bg-conecta-primary/8">
          <div
            className="h-full rounded-full"
            style={{ width: `${max > 0 ? (qtd / max) * 100 : 0}%`, background: cor }}
          />
        </div>
      </td>
      <td className="w-24 py-2 pl-3 text-right tabular-nums">
        <span className="font-display font-bold text-conecta-accent">{qtd}</span>
        <span className="ml-1 text-[11px] text-conecta-muted">({pct(qtd, total)}%)</span>
      </td>
    </tr>
  );
}

function PivotTabela({
  titulo,
  icone,
  coluna,
  linhas,
  escalas,
  limite,
  ordem,
}: {
  titulo: string;
  icone: React.ComponentType<{ className?: string }>;
  coluna: string;
  linhas: LinhaCruzamento[];
  escalas: { id: string; nome: string }[];
  limite: number;
  ordem?: readonly string[];
}) {
  const { linhas: itens, resto } = pivotar(linhas, limite, ordem);
  return (
    <ConectaCard noPadding>
      <div className="p-5 pb-3">
        <SectionHeader label={titulo} icon={icone} />
      </div>
      <div className="overflow-x-auto">
        <table className="conecta-table">
          <thead>
            <tr>
              <th>{coluna}</th>
              {escalas.map((e) => (
                <th key={e.id} className="text-center">
                  {e.nome}
                </th>
              ))}
              <th className="text-center">Sem escala</th>
              <th className="text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((l) => (
              <tr key={l.chave}>
                <td className="font-display font-semibold text-conecta-primary">{l.chave}</td>
                {escalas.map((e) => {
                  const v = l.porEscala[e.id] ?? 0;
                  return (
                    <td
                      key={e.id}
                      className={`text-center tabular-nums ${v ? 'text-conecta-primary' : 'text-conecta-muted/50'}`}
                    >
                      {v || '–'}
                    </td>
                  );
                })}
                <td
                  className={`text-center tabular-nums ${
                    l.semEscala ? 'font-semibold text-conecta-accent' : 'text-conecta-muted/50'
                  }`}
                >
                  {l.semEscala || '–'}
                </td>
                <td className="text-center tabular-nums font-display font-bold text-conecta-primary">
                  {l.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {itens.length === 0 && (
        <p className="py-8 text-center text-sm text-conecta-muted">Sem colaboradores para exibir.</p>
      )}
      {resto > 0 && (
        <p className="px-5 py-3 text-[12px] text-conecta-muted">
          + {resto} colaboradores em outras linhas (mostrando as {limite} maiores).
        </p>
      )}
    </ConectaCard>
  );
}

export function EscalasIndicadores({
  dados,
  filialNome,
  turnoRotulo,
}: {
  dados: IndicadoresEscalas;
  /** Nome da filial filtrada; nulo = todas (mostra também o quadro por filial). */
  filialNome: string | null;
  /** Rótulo do turno filtrado; nulo = todos os turnos. */
  turnoRotulo: string | null;
}) {
  const { total, comEscala, semEscala, escalas } = dados;
  // Mostra escalas ativas e qualquer desativada que ainda tenha gente.
  const visiveis = escalas.filter((e) => e.ativo || e.qtd > 0);
  const maxEscala = Math.max(1, semEscala, ...visiveis.map((e) => e.qtd));
  const porDia = contarPorDia(escalas);
  const maxDia = Math.max(1, ...porDia);
  const ativas = escalas.filter((e) => e.ativo);
  const ativasEmUso = ativas.filter((e) => e.qtd > 0).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          rotulo="Colaboradores ativos"
          valor={total}
          detalhe={`${filialNome ?? 'Todas as filiais'} · ${turnoRotulo ?? 'todos os turnos'}`}
        />
        <Kpi
          rotulo="Com escala definida"
          valor={comEscala}
          detalhe={`${pct(comEscala, total)}% do quadro`}
        />
        <Kpi
          rotulo="Sem escala"
          valor={semEscala}
          detalhe={semEscala > 0 ? 'Defina no Quadro' : 'Todos com escala'}
          alerta={semEscala > 0}
        />
        <Kpi
          rotulo="Escalas em uso"
          valor={`${ativasEmUso}/${ativas.length}`}
          detalhe="ativas com pelo menos 1 colaborador"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ConectaCard>
          <SectionHeader label="Colaboradores por escala" icon={BarChart3} className="mb-4" />
          <table className="w-full text-sm">
            <tbody>
              {visiveis.map((e) => (
                <BarraLinha
                  key={e.id}
                  rotulo={e.nome}
                  detalhe={formatarDias(e.dias)}
                  qtd={e.qtd}
                  max={maxEscala}
                  total={total}
                />
              ))}
              <BarraLinha
                rotulo="Sem escala"
                qtd={semEscala}
                max={maxEscala}
                total={total}
                cor="#E8621A"
              />
            </tbody>
          </table>
        </ConectaCard>

        <ConectaCard>
          <SectionHeader label="Trabalhando em cada dia" icon={CalendarDays} className="mb-4" />
          <table className="w-full text-sm">
            <tbody>
              {DIAS_SEMANA.map((d) => (
                <BarraLinha
                  key={d.valor}
                  rotulo={d.longo}
                  qtd={porDia[d.valor] ?? 0}
                  max={maxDia}
                  total={total}
                />
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-conecta-muted">
            Conta quem tem escala definida; percentual sobre o total de colaboradores ativos.
          </p>
        </ConectaCard>
      </div>

      <PivotTabela
        titulo="Turno × escala"
        icone={Clock}
        coluna="Turno (hora de entrada)"
        linhas={dados.porTurno}
        escalas={visiveis}
        limite={10}
        ordem={ORDEM_TURNOS}
      />
      <PivotTabela
        titulo="Função × escala"
        icone={Briefcase}
        coluna="Função"
        linhas={dados.porFuncao}
        escalas={visiveis}
        limite={LIMITE_LINHAS}
      />
      <PivotTabela
        titulo="Seção × escala"
        icone={Layers}
        coluna="Seção"
        linhas={dados.porSecao}
        escalas={visiveis}
        limite={LIMITE_LINHAS}
      />
      {!filialNome && (
        <PivotTabela
          titulo="Filial × escala"
          icone={Map}
          coluna="Filial"
          linhas={dados.porFilial}
          escalas={visiveis}
          limite={40}
        />
      )}
      {total === 0 && (
        <p className="flex items-center gap-2 text-sm text-conecta-muted">
          <Users className="h-4 w-4" /> Nenhum colaborador ativo neste filtro.
        </p>
      )}
    </div>
  );
}
