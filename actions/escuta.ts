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

// Álbum cross-filial das últimas 3 semanas (semana atual + 2 anteriores).
// Ignora isolamento por filial — é leitura tipo benchmarking.
export async function listarReunioesAlbum() {
  await requireSession();

  // Início da semana de 2 semanas atrás (segunda-feira 00:00 local).
  const hoje = new Date();
  const dow = hoje.getDay(); // 0=Dom, 1=Seg, ...
  const diasParaSegunda = (dow + 6) % 7;
  const inicio = new Date(hoje);
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - diasParaSegunda - 14);
  const inicioStr = inicio.toISOString().slice(0, 10);

  const rows = await db.select({
    id: schema.escutaReunioes.id,
    filialCodigo: schema.escutaReunioes.filialCodigo,
    filialNome: schema.escutaReunioes.filialNome,
    turma: schema.escutaReunioes.turma,
    dataReuniao: schema.escutaReunioes.dataReuniao,
    fotos: schema.escutaReunioes.fotos,
  })
    .from(schema.escutaReunioes)
    .where(gte(schema.escutaReunioes.dataReuniao, inicioStr))
    .orderBy(desc(schema.escutaReunioes.dataReuniao), desc(schema.escutaReunioes.criadoEm))
    .limit(200);

  return rows
    .map((r) => {
      const fotos = (r.fotos as Array<{ path: string }> | null) ?? [];
      const principal = fotos[0]?.path;
      if (!principal) return null;
      return {
        id: r.id,
        filialCodigo: r.filialCodigo,
        filialNome: r.filialNome,
        turma: r.turma,
        dataReuniao: r.dataReuniao,
        fotoUrl: `/api/escuta/foto?path=${encodeURIComponent(principal)}`,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

// Percepcoes finais para a aba Nuvem.
// Filial: forca isolamento. Admin: pode filtrar por filialCodigo.
export async function listarPercepcoesNuvem(filtro?: { filialCodigo?: string }) {
  const s = await requireSession();
  const where: SQL[] = [];
  if (s.perfil === 'filial') {
    where.push(eq(schema.escutaReunioes.filialCodigo, s.filialCodigo));
  } else if (filtro?.filialCodigo) {
    where.push(eq(schema.escutaReunioes.filialCodigo, filtro.filialCodigo));
  }
  return db.select({
    id: schema.escutaReunioes.id,
    filialCodigo: schema.escutaReunioes.filialCodigo,
    filialNome: schema.escutaReunioes.filialNome,
    dataReuniao: schema.escutaReunioes.dataReuniao,
    texto: schema.escutaReunioes.percepcaoFinal,
  })
    .from(schema.escutaReunioes)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(schema.escutaReunioes.dataReuniao), desc(schema.escutaReunioes.criadoEm))
    .limit(1000);
}

// Lista filiais distintas com pelo menos uma percepcao registrada.
// Usada para o dropdown de filtro do admin.
export async function listarFiliaisComPercepcoes() {
  await requireSession('admin');
  const rows = await db
    .selectDistinct({
      codigo: schema.escutaReunioes.filialCodigo,
      nome: schema.escutaReunioes.filialNome,
    })
    .from(schema.escutaReunioes);
  return rows
    .map((r) => ({ codigo: r.codigo, nome: r.nome ?? r.codigo }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// Constrói URLs same-origin que apontam para o proxy /api/escuta/foto.
// Same-origin evita os problemas de Cross-Origin-Resource-Policy que o
// browser aplica a <img> apontando direto para o Supabase Storage.
export async function urlsAssinadasFotos(paths: string[]) {
  return paths.map((p) => `/api/escuta/foto?path=${encodeURIComponent(p)}`);
}
