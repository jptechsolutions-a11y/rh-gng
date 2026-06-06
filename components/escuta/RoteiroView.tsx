import {
  IconAcolher, IconOuvir, IconIdentificar, IconAgir,
} from '@/components/brand/ConectaPillarIcons';

type Etapa = { ordem: number; titulo: string; descricao: string };

export function RoteiroView({
  heroTitulo, heroSubtitulo, heroFrase, bannerTexto, etapas,
}: {
  heroTitulo: string; heroSubtitulo: string; heroFrase: string;
  bannerTexto: string; etapas: Etapa[];
}) {
  const [primeira, ...resto] = heroTitulo.split(' ');
  return (
    <section className="space-y-6">
      <div className="text-center space-y-2 pt-2">
        <h2 className="font-display text-3xl lg:text-4xl font-extrabold tracking-tight text-conecta-primary">
          {primeira} <span className="text-conecta-accent">{resto.join(' ') || ''}</span>
        </h2>
        <p className="font-display text-[11px] uppercase tracking-[0.32em] text-conecta-muted">
          {heroSubtitulo}
        </p>
        <p className="max-w-2xl mx-auto text-conecta-muted">{heroFrase}</p>
      </div>

      <div className="rounded-2xl bg-conecta-accent text-white px-5 py-4 text-center font-display font-semibold">
        {bannerTexto}
      </div>

      <ol className="space-y-3">
        {etapas.sort((a, b) => a.ordem - b.ordem).map((e) => (
          <li key={e.ordem}
              className="flex gap-4 items-start rounded-2xl bg-white border border-conecta-primary/10 px-5 py-4 shadow-card">
            <span className="grid place-items-center h-10 w-10 rounded-full bg-conecta-accent text-white font-display font-bold shrink-0">
              {e.ordem}
            </span>
            <div className="min-w-0">
              <h3 className="font-display font-extrabold text-conecta-primary tracking-tight">
                {e.titulo}
              </h3>
              <p className="text-sm text-conecta-muted mt-0.5">{e.descricao}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl bg-conecta-primary text-white px-5 py-4 flex flex-wrap justify-around gap-3">
        {[
          { Icon: IconAcolher, title: 'ACOLHER', sub: 'para integrar' },
          { Icon: IconOuvir, title: 'OUVIR', sub: 'para entender' },
          { Icon: IconIdentificar, title: 'IDENTIFICAR', sub: 'para evoluir' },
          { Icon: IconAgir, title: 'AGIR', sub: 'para transformar' },
        ].map(({ Icon, title, sub }) => (
          <div key={title} className="flex items-center gap-2">
            <span className="grid place-items-center h-7 w-7 rounded-full border border-white/55">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="leading-tight">
              <div className="text-[11px] font-display font-semibold tracking-[0.14em]">{title}</div>
              <div className="text-[9px] text-conecta-accentLight tracking-wide">{sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
