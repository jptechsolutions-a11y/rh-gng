'use server';

import { db, schema } from '@/db/client';
import { and, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { requireSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  NovaReuniaoSchema, ConfigRoteiroSchema, ConfigPilaresSchema,
} from '@/lib/escuta/validators';

export async function salvarReuniao(payload: unknown) {
  const s = await requireSession();
  if (s.perfil !== 'filial' && s.perfil !== 'admin') throw new Error('FORBIDDEN');

  const data = NovaReuniaoSchema.parse(payload);

  const filialCodigo = s.perfil === 'filial' ? s.filialCodigo : 'admin';
  const filialNome   = s.perfil === 'filial' ? s.filialNome   : 'Admin';
  const criadoPor    = s.perfil === 'filial' ? `filial:${s.filialCodigo}` : `admin:${s.usuario}`;

  const rows = await db.insert(schema.escutaReunioes).values({
    filialCodigo, filialNome,
    turma: data.turma.trim(),
    dataReuniao: data.dataReuniao,
    responsavel: data.responsavel.trim(),
    percepcoes: data.percepcoes,
    percepcaoFinal: data.percepcaoFinal.trim(),
    fotos: data.fotos.map((f) => ({ path: f.path, size: f.size })),
    presenca: data.presenca,
    criadoPor,
  }).returning({ id: schema.escutaReunioes.id });

  const row = rows[0];
  if (!row) throw new Error('Falha ao inserir reunião');

  revalidatePath('/escuta/historico');
  redirect(`/escuta/${row.id}?ok=1`);
}

export async function salvarConfigRoteiro(payload: unknown) {
  const s = await requireSession('admin');
  const data = ConfigRoteiroSchema.parse(payload);

  await db.insert(schema.escutaRoteiro).values({
    id: 1,
    heroTitulo: data.heroTitulo,
    heroSubtitulo: data.heroSubtitulo,
    heroFrase: data.heroFrase,
    bannerTexto: data.bannerTexto,
    etapas: data.etapas,
    atualizadoPor: `admin:${s.usuario}`,
  }).onConflictDoUpdate({
    target: schema.escutaRoteiro.id,
    set: {
      heroTitulo: data.heroTitulo,
      heroSubtitulo: data.heroSubtitulo,
      heroFrase: data.heroFrase,
      bannerTexto: data.bannerTexto,
      etapas: data.etapas,
      atualizadoEm: sql`now()`,
      atualizadoPor: `admin:${s.usuario}`,
    },
  });
  revalidatePath('/escuta');
}

export async function salvarConfigPilares(payload: unknown) {
  await requireSession('admin');
  const data = ConfigPilaresSchema.parse(payload);
  for (const p of data.pilares) {
    await db.update(schema.escutaPilares)
      .set({ nome: p.nome, perguntas: p.perguntas })
      .where(eq(schema.escutaPilares.id, p.id));
  }
  revalidatePath('/escuta');
}

export async function listarReunioes(filtro?: {
  filialCodigo?: string; de?: string; ate?: string;
}) {
  const s = await requireSession();
  const where: SQL[] = [];
  if (s.perfil === 'filial') {
    where.push(eq(schema.escutaReunioes.filialCodigo, s.filialCodigo));
  } else if (filtro?.filialCodigo) {
    where.push(eq(schema.escutaReunioes.filialCodigo, filtro.filialCodigo));
  }
  if (filtro?.de)  where.push(gte(schema.escutaReunioes.dataReuniao, filtro.de));
  if (filtro?.ate) where.push(lte(schema.escutaReunioes.dataReuniao, filtro.ate));

  return db.select({
    id: schema.escutaReunioes.id,
    filialCodigo: schema.escutaReunioes.filialCodigo,
    filialNome: schema.escutaReunioes.filialNome,
    turma: schema.escutaReunioes.turma,
    dataReuniao: schema.escutaReunioes.dataReuniao,
    responsavel: schema.escutaReunioes.responsavel,
    totalPresentes: sql<number>`(
      select count(*)::int from jsonb_array_elements(${schema.escutaReunioes.presenca}) e
      where (e->>'presente')::bool = true
    )`.as('total_presentes'),
    totalPessoas: sql<number>`jsonb_array_length(${schema.escutaReunioes.presenca})`.as('total_pessoas'),
    fotos: schema.escutaReunioes.fotos,
    criadoEm: schema.escutaReunioes.criadoEm,
  })
    .from(schema.escutaReunioes)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(schema.escutaReunioes.dataReuniao), desc(schema.escutaReunioes.criadoEm))
    .limit(500);
}

export async function carregarReuniao(id: string) {
  const s = await requireSession();
  const [r] = await db.select().from(schema.escutaReunioes)
    .where(eq(schema.escutaReunioes.id, id)).limit(1);
  if (!r) return null;
  if (s.perfil === 'filial' && r.filialCodigo !== s.filialCodigo) return null;
  return r;
}

export async function urlsAssinadasFotos(paths: string[]) {
  if (paths.length === 0) return [] as string[];
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const out: string[] = [];
  for (const p of paths) {
    const { data } = await supabase.storage.from('escuta-evidencias')
      .createSignedUrl(p, 3600);
    out.push(data?.signedUrl ?? '');
  }
  return out;
}
