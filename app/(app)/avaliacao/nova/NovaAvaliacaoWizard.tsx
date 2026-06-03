'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CompetenciaCard } from '@/components/avaliacao/CompetenciaCard';
import { FatorRatingRow } from '@/components/avaliacao/FatorRatingRow';
import { ProgressoAvaliacao } from '@/components/avaliacao/ProgressoAvaliacao';
import { ResultadoCard } from '@/components/avaliacao/ResultadoCard';
import { calcularPontuacao, classificar } from '@/lib/avaliacao/calculos';
import { buscarPessoaPorMatricula, salvarAvaliacao } from '@/actions/avaliacao';

type Competencia = {
  id: string;
  nome: string;
  fatores: { id: string; texto: string; ordem: number }[];
};
type Pessoa = {
  id: string;
  matricula: string;
  nome: string;
  funcao: string | null;
  filialId: string | null;
  regional: string | null;
} | null;

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`w-full rounded-md border border-slate-200 bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-perlog-orange/40 ${className}`}
    />
  );
}

export function NovaAvaliacaoWizard({ competencias }: { competencias: Competencia[] }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pending, start] = useTransition();
  const [matAv, setMatAv] = useState('');
  const [matGe, setMatGe] = useState('');
  const [avaliado, setAvaliado] = useState<Pessoa>(null);
  const [gestor, setGestor] = useState<Pessoa>(null);
  const totalFatores = useMemo(
    () => competencias.reduce((a, c) => a + c.fatores.length, 0),
    [competencias],
  );
  const [notas, setNotas] = useState<Record<string, number>>({});
  const [pontosFortes, setPontosFortes] = useState('');
  const [oportunidades, setOportunidades] = useState('');
  const [comentarios, setComentarios] = useState('');

  const feito = Object.keys(notas).length;
  const completo = feito === totalFatores && totalFatores > 0;
  const notasArr = useMemo(
    () => Object.entries(notas).map(([fatorId, nota]) => ({ fatorId, nota })),
    [notas],
  );
  const pontuacao = completo ? calcularPontuacao(notasArr.map((n) => n.nota)) : 0;
  const classif = completo ? classificar(pontuacao) : ('PRECISA MELHORAR' as const);

  function buscar(tipo: 'colaborador' | 'gestor') {
    const mat = (tipo === 'colaborador' ? matAv : matGe).trim();
    if (!mat) return;
    start(async () => {
      const p = await buscarPessoaPorMatricula(mat, tipo);
      if (!p) {
        toast.error(`Matrícula não encontrada para ${tipo}`);
        return;
      }
      if (tipo === 'colaborador') setAvaliado(p);
      else setGestor(p);
    });
  }

  function salvar() {
    if (!avaliado || !gestor || !completo) return;
    start(async () => {
      try {
        const id = await salvarAvaliacao({
          avaliadoId: avaliado.id,
          gestorId: gestor.id,
          dataAvaliacao: new Date(),
          notas: notasArr,
          pontosFortes,
          oportunidades,
          comentarios,
        });
        toast.success('Avaliação salva');
        router.push(`/avaliacao/${id}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`flex-1 rounded-md border px-3 py-2 text-center text-sm ${
              step === n
                ? 'bg-perlog-navy text-white border-perlog-navy'
                : 'bg-white text-perlog-slate border-slate-200'
            }`}
          >
            {n}. {n === 1 ? 'Identificação' : n === 2 ? 'Avaliação' : 'Feedback'}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <CardTitle className="text-base">Identificação</CardTitle>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Matrícula do avaliado *</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={matAv}
                    onChange={(e) => setMatAv(e.target.value)}
                    onBlur={() => buscar('colaborador')}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => buscar('colaborador')}
                    disabled={pending}
                  >
                    Buscar
                  </Button>
                </div>
                {avaliado && (
                  <p className="mt-1 text-xs text-perlog-slate">
                    {avaliado.nome}
                    {avaliado.funcao ? ` — ${avaliado.funcao}` : ''}
                  </p>
                )}
              </div>
              <div>
                <Label>Matrícula do gestor *</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={matGe}
                    onChange={(e) => setMatGe(e.target.value)}
                    onBlur={() => buscar('gestor')}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => buscar('gestor')}
                    disabled={pending}
                  >
                    Buscar
                  </Button>
                </div>
                {gestor && (
                  <p className="mt-1 text-xs text-perlog-slate">
                    {gestor.nome}
                    {gestor.funcao ? ` — ${gestor.funcao}` : ''}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!avaliado || !gestor || avaliado.id === gestor.id}
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <>
          <ProgressoAvaliacao feito={feito} total={totalFatores} />
          {competencias.map((c) => (
            <CompetenciaCard key={c.id} titulo={c.nome}>
              {c.fatores.map((f) => (
                <FatorRatingRow
                  key={f.id}
                  fatorId={f.id}
                  texto={f.texto}
                  ordem={f.ordem}
                  value={notas[f.id] ?? null}
                  onChange={(n) => setNotas((prev) => ({ ...prev, [f.id]: n }))}
                />
              ))}
            </CompetenciaCard>
          ))}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button onClick={() => setStep(3)} disabled={!completo}>
              Continuar
            </Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <Card>
            <CardContent className="space-y-3 pt-6">
              <CardTitle className="text-base">Feedback</CardTitle>
              <div>
                <Label>Pontos fortes</Label>
                <Textarea
                  rows={4}
                  value={pontosFortes}
                  onChange={(e) => setPontosFortes(e.target.value)}
                />
              </div>
              <div>
                <Label>Oportunidades de desenvolvimento</Label>
                <Textarea
                  rows={4}
                  value={oportunidades}
                  onChange={(e) => setOportunidades(e.target.value)}
                />
              </div>
              <div>
                <Label>Comentários gerais</Label>
                <Textarea
                  rows={4}
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
          <ResultadoCard pontuacao={pontuacao} classificacao={classif} />
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              Voltar
            </Button>
            <Button onClick={salvar} disabled={pending || !completo}>
              Salvar avaliação
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
