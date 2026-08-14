import { describe, it, expect } from 'vitest';
import { detectarMudancas, type ColaboradorAtual } from './detectar-mudancas';
import type { LinhaQuadro } from './xls-parser';

function linha(overrides: Partial<LinhaQuadro> = {}): LinhaQuadro {
  return {
    regional: 'SP',
    bandeira: 'GG',
    codfilial: 20,
    chapa: '1',
    nome: 'A',
    funcao: 'AUX. ADMINISTRATIVO',
    secao: 'ADMINISTRATIVO',
    horario: null,
    nacionalidade: null,
    dtAdmissao: null,
    mesNasc: null,
    idade: null,
    situacao: 'Ativo',
    ...overrides,
  };
}

function atual(overrides: Partial<ColaboradorAtual> = {}): ColaboradorAtual {
  return {
    chapa: '1',
    nome: 'A',
    regional: 'SP',
    bandeira: 'GG',
    codfilial: 20,
    funcao: 'AUX. ADMINISTRATIVO',
    secao: 'ADMINISTRATIVO',
    horario: null,
    nacionalidade: null,
    dtAdmissao: null,
    mesNasc: null,
    idade: null,
    situacao: 'Ativo',
    tierResolvido: 'base',
    ...overrides,
  };
}

describe('detectarMudancas', () => {
  it('nada mudou → algoMudou = false', () => {
    const r = detectarMudancas(atual(), linha(), 'base');
    expect(r.algoMudou).toBe(false);
  });

  it('só a seção mudou → algoMudou = true', () => {
    const r = detectarMudancas(atual({ secao: 'RECEBIMENTO' }), linha({ secao: 'EXPEDICAO' }), 'base');
    expect(r.algoMudou).toBe(true);
  });

  it('só a função mudou (mesmo tier) → algoMudou = true', () => {
    const r = detectarMudancas(
      atual({ funcao: 'AUX. ADMINISTRATIVO' }),
      linha({ funcao: 'AUX. DE ESTOQUE' }),
      'base',
    );
    expect(r.algoMudou).toBe(true);
  });

  it('mudou horário → algoMudou = true', () => {
    const r = detectarMudancas(atual({ horario: 'MANHA' }), linha({ horario: 'TARDE' }), 'base');
    expect(r.algoMudou).toBe(true);
  });

  it('mudou tier → tierMudou = true e algoMudou = true', () => {
    const r = detectarMudancas(atual({ tierResolvido: 'base' }), linha(), 'supervisor');
    expect(r.tierMudou).toBe(true);
    expect(r.algoMudou).toBe(true);
  });

  it('mudou filial → filialMudou = true e algoMudou = true', () => {
    const r = detectarMudancas(atual({ codfilial: 20 }), linha({ codfilial: 167 }), 'base');
    expect(r.filialMudou).toBe(true);
    expect(r.algoMudou).toBe(true);
  });
});
