import { describe, expect, it } from 'vitest';
import {
  contarOcorrencias,
  normalizar,
  textoContemPalavra,
  tokenizar,
} from '../nuvem';

describe('normalizar', () => {
  it('remove acentos e baixa caixa', () => {
    expect(normalizar('Ação Coração')).toBe('acao coracao');
  });
});

describe('tokenizar', () => {
  it('retorna vazio para texto vazio', () => {
    expect(tokenizar('')).toEqual([]);
  });

  it('descarta stopwords e tokens curtos', () => {
    expect(tokenizar('o time da filial é muito bom')).toEqual(['time', 'filial', 'bom']);
  });

  it('normaliza acentos: "ação" e "acao" colidem', () => {
    expect(tokenizar('ação acao')).toEqual(['acao', 'acao']);
  });

  it('quebra por pontuacao e quebras de linha', () => {
    expect(tokenizar('lider, time;\nresultado!')).toEqual([
      'lider', 'time', 'resultado',
    ]);
  });
});

describe('contarOcorrencias', () => {
  it('agrega contagem entre textos e ordena desc', () => {
    const r = contarOcorrencias([
      'lider lider time',
      'lider resultado',
      'time motivacao',
    ]);
    expect(r[0]).toEqual({ text: 'lider', value: 3 });
    expect(r[1]).toEqual({ text: 'time', value: 2 });
  });

  it('respeita topN', () => {
    const textos = ['a b c d e f g h i j'.split(' ').map((x) => x.repeat(3)).join(' ')];
    expect(contarOcorrencias(textos, 3)).toHaveLength(3);
  });
});

describe('textoContemPalavra', () => {
  it('match por token completo, ignorando acentos', () => {
    expect(textoContemPalavra('A liderança é forte', 'lideranca')).toBe(true);
  });
  it('nao casa substring parcial', () => {
    expect(textoContemPalavra('lideranca', 'lider')).toBe(false);
  });
});
