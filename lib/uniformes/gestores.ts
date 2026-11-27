import { normalizarCodigoFilial } from '@/lib/vagas/normalizar-codigo-filial';

/** Tiers do QLP que recebem usuário de gestor (supervisor para cima). */
export const TIERS_GESTOR = ['gerente', 'subgerente', 'coord', 'supervisor'] as const;

const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Palavras do nome em minúsculas, sem acento e só com letras. */
export function palavrasDoNome(nome: string): string[] {
  return semAcento(nome)
    .toLowerCase()
    .split(/\s+/)
    .map((p) => p.replace(/[^a-z]/g, ''))
    .filter(Boolean);
}

export const primeiroNome = (nome: string): string => palavrasDoNome(nome)[0] ?? '';

/** `primeiro.ultimo` (ignora "de/da/do…" no fim). Com uma palavra só, devolve só ela. */
export function usuarioBase(nome: string): string {
  const p = palavrasDoNome(nome);
  if (p.length === 0) return '';
  const primeiro = p[0]!;
  const resto = p.slice(1).filter((x) => !PARTICULAS.has(x));
  const ultimo = resto[resto.length - 1];
  return ultimo ? `${primeiro}.${ultimo}` : primeiro;
}

/** 4 últimos dígitos da matrícula + código da filial + primeiro nome: 78900004 / 230 / Juliano → 0004230juliano */
export function senhaGestor(chapa: string, codfilial: string | number, nome: string): string {
  const digitos = chapa.replace(/\D/g, '');
  return `${digitos.slice(-4).padStart(4, '0')}${normalizarCodigoFilial(String(codfilial))}${primeiroNome(nome)}`;
}

/**
 * Dá um usuário único a cada base: o 1º fica `maria.silva`, os seguintes `maria.silva2`, `maria.silva3`…
 * `ocupados` são usuários que já existem (admins e usuários de acesso).
 */
export function atribuirUsuarios(bases: string[], ocupados: Set<string>): { usuario: string; repetido: boolean }[] {
  const usados = new Set(ocupados);
  return bases.map((base) => {
    let usuario = base;
    let n = 1;
    while (usados.has(usuario)) {
      n += 1;
      usuario = `${base}${n}`;
    }
    usados.add(usuario);
    return { usuario, repetido: n > 1 };
  });
}
