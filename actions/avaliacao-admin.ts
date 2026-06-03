'use server';

import { db, schema } from '@/db/client';
import { eq, and, ilike, asc } from 'drizzle-orm';
import { requireSession } from '@/lib/auth/session';
import { PessoaSchema, type PessoaInput } from '@/lib/avaliacao/validators';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

async function logAcao(usuario: string, acao: string, detalhe?: string) {
  const h = await headers();
  await db.insert(schema.logAcessos).values({
    usuario, acao, detalhe: detalhe ?? null,
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: h.get('user-agent') ?? null,
  });
}

export type ListarPessoasFiltros = { busca?: string; filialId?: string; tipo?: 'colaborador' | 'gestor' | 'ambos' | ''; ativo?: boolean };

export async function listarPessoas(filtros?: ListarPessoasFiltros) {
  await requireSession('admin');
  const wheres = [];
  if (filtros?.busca) wheres.push(ilike(schema.pessoas.nome, `%${filtros.busca}%`));
  if (filtros?.filialId) wheres.push(eq(schema.pessoas.filialId, filtros.filialId));
  if (filtros?.tipo === 'colaborador') wheres.push(eq(schema.pessoas.isColaborador, true));
  if (filtros?.tipo === 'gestor') wheres.push(eq(schema.pessoas.isGestor, true));
  if (filtros?.ativo !== undefined) wheres.push(eq(schema.pessoas.ativo, filtros.ativo));
  return db.select().from(schema.pessoas)
    .where(wheres.length ? and(...wheres) : undefined)
    .orderBy(asc(schema.pessoas.nome));
}

export async function criarPessoa(input: unknown) {
  const s = await requireSession('admin');
  const data = PessoaSchema.parse(input);
  const rows = await db.insert(schema.pessoas).values(data).returning({ id: schema.pessoas.id });
  const row = rows[0];
  if (!row) throw new Error('Falha ao criar pessoa');
  await logAcao(s.usuario, 'avaliacao.config.pessoas.criar', `${data.matricula}|${data.nome}`);
  revalidatePath('/admin/config/pessoas');
  return row.id;
}

export async function atualizarPessoa(id: string, input: unknown) {
  const s = await requireSession('admin');
  const data = PessoaSchema.parse(input);
  await db.update(schema.pessoas).set(data).where(eq(schema.pessoas.id, id));
  await logAcao(s.usuario, 'avaliacao.config.pessoas.atualizar', `${id}|${data.matricula}`);
  revalidatePath('/admin/config/pessoas');
}

export async function inativarPessoa(id: string) {
  const s = await requireSession('admin');
  await db.update(schema.pessoas).set({ ativo: false }).where(eq(schema.pessoas.id, id));
  await logAcao(s.usuario, 'avaliacao.config.pessoas.inativar', id);
  revalidatePath('/admin/config/pessoas');
}

export type CsvLinha = { linha: number; ok: boolean; erro?: string; data?: PessoaInput };

export async function previewCsvPessoas(csvTexto: string, filiaisPorCodigo: Record<string, string>): Promise<CsvLinha[]> {
  await requireSession('admin');
  const linhas = csvTexto.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (linhas.length === 0) return [];
  const header = linhas[0]!.split(',').map((c) => c.trim().toLowerCase());
  const idx = (col: string) => header.indexOf(col);
  const required = ['matricula', 'nome'];
  const missing = required.filter((c) => idx(c) === -1);
  if (missing.length) throw new Error(`Cabeçalho faltando: ${missing.join(', ')}`);

  const out: CsvLinha[] = [];
  for (let i = 1; i < linhas.length; i++) {
    const cells = linhas[i]!.split(',').map((c) => c.trim());
    const filialCodigo = idx('filial') !== -1 ? (cells[idx('filial')] ?? '') : '';
    const tipo = (idx('tipo') !== -1 ? (cells[idx('tipo')] ?? '') : '').toLowerCase();
    const raw = {
      matricula: cells[idx('matricula')] ?? '',
      nome: cells[idx('nome')] ?? '',
      funcao: idx('funcao') !== -1 ? (cells[idx('funcao')] ?? null) : null,
      regional: idx('regional') !== -1 ? (cells[idx('regional')] ?? null) : null,
      filialId: filialCodigo ? filiaisPorCodigo[filialCodigo] ?? null : null,
      isColaborador: tipo === '' || tipo === 'colaborador' || tipo === 'ambos',
      isGestor: tipo === 'gestor' || tipo === 'ambos',
      ativo: true,
    };
    const parsed = PessoaSchema.safeParse(raw);
    if (!parsed.success) {
      out.push({ linha: i + 1, ok: false, erro: parsed.error.issues[0]?.message ?? 'inválido' });
    } else if (filialCodigo && !filiaisPorCodigo[filialCodigo]) {
      out.push({ linha: i + 1, ok: false, erro: `Filial "${filialCodigo}" não encontrada` });
    } else {
      out.push({ linha: i + 1, ok: true, data: parsed.data });
    }
  }
  return out;
}

export async function importarPessoasCsv(linhas: CsvLinha[]) {
  const s = await requireSession('admin');
  const validas = linhas.filter((l) => l.ok && l.data).map((l) => l.data!) as PessoaInput[];
  let inseridas = 0, atualizadas = 0;
  for (const p of validas) {
    const existe = await db.select({ id: schema.pessoas.id }).from(schema.pessoas)
      .where(eq(schema.pessoas.matricula, p.matricula)).limit(1);
    if (existe.length) {
      await db.update(schema.pessoas).set(p).where(eq(schema.pessoas.id, existe[0]!.id));
      atualizadas++;
    } else {
      await db.insert(schema.pessoas).values(p);
      inseridas++;
    }
  }
  await logAcao(s.usuario, 'avaliacao.config.pessoas.import', `inseridas=${inseridas} atualizadas=${atualizadas}`);
  revalidatePath('/admin/config/pessoas');
  return { inseridas, atualizadas };
}

export async function listarFiliaisParaSelect() {
  await requireSession('admin');
  return db.select({ id: schema.filiais.id, codigo: schema.filiais.codigo, nome: schema.filiais.nome })
    .from(schema.filiais)
    .where(eq(schema.filiais.ativa, true))
    .orderBy(asc(schema.filiais.codigo));
}
