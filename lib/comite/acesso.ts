import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import type { Session } from '@/lib/auth/session';
import { getFiliaisCodigosVisiveis } from '@/lib/auth/session';
import { normalizarCodigoFilial } from '@/lib/vagas/normalizar-codigo-filial';
import type { FilialOpcao } from './tipos';

/** Filiais em que a sessão pode lançar/ver: filial → a própria; visualizador → as dele; admin/nacional → todas. */
export async function filiaisPermitidas(s: Session): Promise<FilialOpcao[]> {
  const todas = await db
    .select({ codigo: schema.filiais.codigo, nome: schema.filiais.nome })
    .from(schema.filiais)
    .where(eq(schema.filiais.ativa, true))
    .orderBy(asc(schema.filiais.codigo));
  const escopo = getFiliaisCodigosVisiveis(s);
  if (!escopo) return todas.map((f) => ({ codigo: normalizarCodigoFilial(f.codigo), nome: f.nome }));
  const set = new Set(escopo.map(normalizarCodigoFilial));
  return todas.filter((f) => set.has(normalizarCodigoFilial(f.codigo))).map((f) => ({ codigo: normalizarCodigoFilial(f.codigo), nome: f.nome }));
}

export const nomeUsuario = (s: Session) =>
  s.perfil === 'filial' ? `Filial ${s.filialCodigo}` : (s.nome ?? s.usuario);
