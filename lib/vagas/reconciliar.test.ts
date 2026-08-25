import { describe, it, expect } from 'vitest';
import { planejarReconciliacao, type VagaAbertaExistente } from './reconciliar';

function vaga(id: string, diasAtras: number): VagaAbertaExistente {
  const createdAt = new Date(Date.now() - diasAtras * 86_400_000);
  return { id, createdAt };
}

describe('planejarReconciliacao', () => {
  it('target maior que o atual → cria o delta, não fecha nada', () => {
    const atuais = [vaga('a', 5)];
    const r = planejarReconciliacao(atuais, 3);
    expect(r).toEqual({ criar: 2, fecharIds: [] });
  });

  it('target igual ao atual → nada a fazer', () => {
    const atuais = [vaga('a', 5), vaga('b', 2)];
    const r = planejarReconciliacao(atuais, 2);
    expect(r).toEqual({ criar: 0, fecharIds: [] });
  });

  it('target menor → fecha as mais antigas primeiro', () => {
    // b é a mais antiga (10 dias), depois a (5), depois c (1)
    const atuais = [vaga('a', 5), vaga('b', 10), vaga('c', 1)];
    const r = planejarReconciliacao(atuais, 1);
    expect(r.criar).toBe(0);
    expect(r.fecharIds).toEqual(['b', 'a']);
  });

  it('target 0 e nenhuma vaga aberta → nada a fazer', () => {
    const r = planejarReconciliacao([], 0);
    expect(r).toEqual({ criar: 0, fecharIds: [] });
  });

  it('target 0 com vagas abertas → fecha todas', () => {
    const atuais = [vaga('a', 5), vaga('b', 1)];
    const r = planejarReconciliacao(atuais, 0);
    expect(r.criar).toBe(0);
    expect(r.fecharIds.sort()).toEqual(['a', 'b']);
  });

  it('nenhuma vaga aberta e target positivo → cria todas', () => {
    const r = planejarReconciliacao([], 4);
    expect(r).toEqual({ criar: 4, fecharIds: [] });
  });
});
