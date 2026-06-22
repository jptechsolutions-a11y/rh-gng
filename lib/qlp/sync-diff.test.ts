import { describe, it, expect } from 'vitest';
import { computeDiff, type EstadoAtual, type LinhaNova } from './sync-diff';
import type { Classificacao } from './autoclassify';

const base = {
  chapa: '1',
  nome: 'A',
  codfilial: 20,
  funcao: 'AUX. ADMINISTRATIVO',
  tier: 'base',
  situacao: 'Ativo',
};

const classifyBase = (): Classificacao => ({ tier: 'base', nivel: null, trilha: 'outros' });

describe('computeDiff', () => {
  it('chapa nova → novos[]', () => {
    const atual: EstadoAtual[] = [];
    const novas: LinhaNova[] = [{ ...base }];
    const d = computeDiff(atual, novas, classifyBase);
    expect(d.novos).toHaveLength(1);
    expect(d.atualizadosSemQuebra).toHaveLength(0);
    expect(d.desligados).toHaveLength(0);
  });

  it('chapa ausente do XLS → desligados[]', () => {
    const atual: EstadoAtual[] = [{ ...base }];
    const novas: LinhaNova[] = [];
    const d = computeDiff(atual, novas, classifyBase);
    expect(d.desligados).toHaveLength(1);
  });

  it('mesma função, só situação mudou → atualizadosSemQuebra[]', () => {
    const atual: EstadoAtual[] = [{ ...base, situacao: 'Ativo' }];
    const novas: LinhaNova[] = [{ ...base, situacao: 'Férias' }];
    const d = computeDiff(atual, novas, classifyBase);
    expect(d.atualizadosSemQuebra).toHaveLength(1);
    expect(d.mudancaTier).toHaveLength(0);
  });

  it('mudou nome → atualizadosSemQuebra[]', () => {
    const atual: EstadoAtual[] = [{ ...base, nome: 'A' }];
    const novas: LinhaNova[] = [{ ...base, nome: 'B' }];
    const d = computeDiff(atual, novas, classifyBase);
    expect(d.atualizadosSemQuebra).toHaveLength(1);
  });

  it('função muda dentro do mesmo tier (Sup I → Sup II) → sem quebra', () => {
    const atual: EstadoAtual[] = [
      { ...base, funcao: 'SUPERVISOR(A) DE LOGISTICA I', tier: 'supervisor' },
    ];
    const novas: LinhaNova[] = [{ ...base, funcao: 'SUPERVISOR(A) DE LOGISTICA II' }];
    const d = computeDiff(atual, novas, (f) => ({
      tier: 'supervisor',
      nivel: f.includes(' II') ? 'ii' : 'i',
      trilha: 'logistica',
    }));
    expect(d.atualizadosSemQuebra).toHaveLength(1);
    expect(d.mudancaTier).toHaveLength(0);
  });

  it('função muda de tier (Sup → Coord) → mudancaTier[]', () => {
    const atual: EstadoAtual[] = [
      { ...base, funcao: 'SUPERVISOR(A) DE LOGISTICA I', tier: 'supervisor' },
    ];
    const novas: LinhaNova[] = [{ ...base, funcao: 'COORD. DE LOGISTICA' }];
    const d = computeDiff(atual, novas, () => ({
      tier: 'coord',
      nivel: 'regional',
      trilha: 'logistica',
    }));
    expect(d.mudancaTier).toHaveLength(1);
    expect(d.mudancaTier[0].tierAntigo).toBe('supervisor');
    expect(d.mudancaTier[0].tierNovo).toBe('coord');
  });

  it('mudou de filial → mudancaFilial[]', () => {
    const atual: EstadoAtual[] = [{ ...base, codfilial: 20 }];
    const novas: LinhaNova[] = [{ ...base, codfilial: 167 }];
    const d = computeDiff(atual, novas, classifyBase);
    expect(d.mudancaFilial).toHaveLength(1);
    expect(d.mudancaTier).toHaveLength(0);
  });

  it('idempotente: aplicar mesmo estado duas vezes → zero mudanças', () => {
    const atual: EstadoAtual[] = [{ ...base }];
    const novas: LinhaNova[] = [{ ...base }];
    const d = computeDiff(atual, novas, classifyBase);
    expect(d.novos).toHaveLength(0);
    expect(d.desligados).toHaveLength(0);
    expect(d.mudancaTier).toHaveLength(0);
    expect(d.mudancaFilial).toHaveLength(0);
    expect(d.atualizadosSemQuebra).toHaveLength(0);
  });

  it('múltiplas linhas: mistura novos, mudancas e desligados', () => {
    const atual: EstadoAtual[] = [
      { ...base, chapa: '1', nome: 'A' },
      { ...base, chapa: '2', nome: 'B', codfilial: 20, tier: 'supervisor' },
      { ...base, chapa: '3', nome: 'C' },
    ];
    const novas: LinhaNova[] = [
      { ...base, chapa: '1', nome: 'A' }, // unchanged
      { ...base, chapa: '2', nome: 'B', codfilial: 167 }, // mudou filial
      { ...base, chapa: '4', nome: 'D' }, // novo
      // chapa 3 sumiu → desligado
    ];
    const d = computeDiff(atual, novas, classifyBase);
    expect(d.novos).toHaveLength(1);
    expect(d.mudancaFilial).toHaveLength(1);
    expect(d.desligados).toHaveLength(1);
    expect(d.atualizadosSemQuebra).toHaveLength(0);
  });
});
