'use client';
import { useState, useTransition } from 'react';
import { Plus, Trash2, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { salvarConfigRoteiro, salvarConfigPilares } from '@/actions/escuta';

type Etapa = { ordem: number; titulo: string; descricao: string };
type Pilar = { id: number; ordem: number; nome: string; icone: string; perguntas: string[] };

export function ConfigEscutaForm({
  roteiroInicial, pilaresIniciais,
}: {
  roteiroInicial: {
    heroTitulo: string; heroSubtitulo: string; heroFrase: string;
    bannerTexto: string; etapas: Etapa[]; diasSugeridos: string[];
  };
  pilaresIniciais: Pilar[];
}) {
  const [roteiro, setRoteiro] = useState(roteiroInicial);
  const [pilares, setPilares] = useState(pilaresIniciais);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const [pending, start] = useTransition();

  function salvar() {
    setMsg(null);
    start(async () => {
      try {
        await salvarConfigRoteiro({
          ...roteiro,
          diasSugeridos: (roteiro.diasSugeridos ?? [])
            .map((d) => d.trim())
            .filter(Boolean),
        });
        await salvarConfigPilares({
          pilares: pilares.map((p) => ({ id: p.id, nome: p.nome, perguntas: p.perguntas })),
        });
        setMsg({ tipo: 'ok', texto: 'Configuração salva.' });
      } catch (e) {
        setMsg({ tipo: 'err', texto: e instanceof Error ? e.message : 'Erro ao salvar.' });
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="font-display font-extrabold text-conecta-primary tracking-tight">Roteiro</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label="Título do hero" value={roteiro.heroTitulo}
                     onChange={(v) => setRoteiro({ ...roteiro, heroTitulo: v })} />
          <TextField label="Subtítulo" value={roteiro.heroSubtitulo}
                     onChange={(v) => setRoteiro({ ...roteiro, heroSubtitulo: v })} />
          <TextField label="Banner" value={roteiro.bannerTexto}
                     onChange={(v) => setRoteiro({ ...roteiro, bannerTexto: v })} />
          <TextArea label="Frase do hero" value={roteiro.heroFrase}
                    onChange={(v) => setRoteiro({ ...roteiro, heroFrase: v })} />
        </div>

        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-conecta-primary">Etapas</div>
          {roteiro.etapas.sort((a, b) => a.ordem - b.ordem).map((e, i) => (
            <div key={i} className="rounded-xl bg-white border border-conecta-primary/10 p-3 grid grid-cols-12 gap-2 items-start">
              <input type="number" min={1} value={e.ordem}
                     onChange={(ev) => setRoteiro({
                       ...roteiro,
                       etapas: roteiro.etapas.map((x, idx) =>
                         idx === i ? { ...x, ordem: Number(ev.target.value) } : x),
                     })}
                     className="col-span-1 border rounded px-2 py-1 text-sm" />
              <input type="text" value={e.titulo} placeholder="Título"
                     onChange={(ev) => setRoteiro({
                       ...roteiro,
                       etapas: roteiro.etapas.map((x, idx) =>
                         idx === i ? { ...x, titulo: ev.target.value } : x),
                     })}
                     className="col-span-4 border rounded px-2 py-1 text-sm" />
              <input type="text" value={e.descricao} placeholder="Descrição"
                     onChange={(ev) => setRoteiro({
                       ...roteiro,
                       etapas: roteiro.etapas.map((x, idx) =>
                         idx === i ? { ...x, descricao: ev.target.value } : x),
                     })}
                     className="col-span-6 border rounded px-2 py-1 text-sm" />
              <button type="button"
                      onClick={() => setRoteiro({
                        ...roteiro,
                        etapas: roteiro.etapas.filter((_, idx) => idx !== i),
                      })}
                      className="col-span-1 text-conecta-muted hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button"
                  onClick={() => setRoteiro({
                    ...roteiro,
                    etapas: [...roteiro.etapas, {
                      ordem: roteiro.etapas.length + 1, titulo: '', descricao: '',
                    }],
                  })}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-conecta-accent hover:text-conecta-primary">
            <Plus className="h-4 w-4" /> Adicionar etapa
          </button>
        </div>

        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-conecta-primary">
            Agenda sugerida — dias para realizar a Escuta G&amp;G
          </div>
          <p className="text-xs text-conecta-muted">
            Esses dias aparecem como sugestão na aba Roteiro da Escuta G&amp;G.
          </p>
          {(roteiro.diasSugeridos ?? []).map((dia, i) => (
            <div key={i} className="rounded-xl bg-white border border-conecta-primary/10 p-3 grid grid-cols-12 gap-2 items-center">
              <input type="text" value={dia} placeholder="Ex.: Quinta"
                     onChange={(ev) => setRoteiro({
                       ...roteiro,
                       diasSugeridos: roteiro.diasSugeridos.map((x, idx) =>
                         idx === i ? ev.target.value : x),
                     })}
                     className="col-span-11 border rounded px-2 py-1 text-sm" />
              <button type="button"
                      onClick={() => setRoteiro({
                        ...roteiro,
                        diasSugeridos: roteiro.diasSugeridos.filter((_, idx) => idx !== i),
                      })}
                      className="col-span-1 text-conecta-muted hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button"
                  onClick={() => setRoteiro({
                    ...roteiro,
                    diasSugeridos: [...(roteiro.diasSugeridos ?? []), ''],
                  })}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-conecta-accent hover:text-conecta-primary">
            <Plus className="h-4 w-4" /> Adicionar dia
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display font-extrabold text-conecta-primary tracking-tight">Pilares</h2>
        {pilares.sort((a, b) => a.ordem - b.ordem).map((p) => (
          <div key={p.id} className="rounded-xl bg-white border border-conecta-primary/10 p-4 space-y-3">
            <TextField label={`Pilar ${p.ordem} — nome`} value={p.nome}
                       onChange={(v) => setPilares(pilares.map((x) =>
                         x.id === p.id ? { ...x, nome: v } : x))} />
            <TextArea label="Perguntas (uma por linha)"
                      value={p.perguntas.join('\n')}
                      onChange={(v) => setPilares(pilares.map((x) =>
                        x.id === p.id
                          ? { ...x, perguntas: v.split('\n').map((s) => s.trim()).filter(Boolean) }
                          : x))} />
          </div>
        ))}
      </section>

      {msg && (
        <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${
          msg.tipo === 'ok'
            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
            : 'text-red-700 bg-red-50 border border-red-200'
        }`}>
          {msg.tipo === 'ok' ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <AlertCircle className="h-4 w-4 mt-0.5" />}
          {msg.texto}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="conecta"
          size="conecta"
          onClick={salvar}
          disabled={pending}
          className="disabled:opacity-70"
        >
          <Save className="h-4 w-4" />
          {pending ? 'Salvando…' : 'Salvar configuração'}
        </Button>
      </div>
    </div>
  );
}

function TextField({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-1">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)}
             className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25" />
    </label>
  );
}

function TextArea({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-conecta-primary mb-1">{label}</div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25" />
    </label>
  );
}
