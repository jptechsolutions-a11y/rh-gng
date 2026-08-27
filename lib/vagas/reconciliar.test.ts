import { describe, it, expect } from 'vitest';
import { planejarReconciliacao, type VagaAbertaExistente } from './reconciliar';

function vaga(id: string, diasAtras: number): VagaAbertaExistente {
  const createdAt = new Date(Date.now() - diasAtras * 86_400_000);
  return { id, createdAt };
}

describe('planejarReconciliacao', () => {
  it('target maior que o total ativo → cria o delta, não fecha nada', () => {
    // 1 vaga ativa (fechável), target 3 → cria 2
    const r = planejarReconciliacao(1, [vaga('a', 5)], 3);
    expect(r).toEqual({ criar: 2, fecharIds: [] });
  });

  it('target igual ao total ativo → nada a fazer', () => {
    const r = planejarReconciliacao(2, [vaga('a', 5), vaga('b', 2)], 2);
    expect(r).toEqual({ criar: 0, fecharIds: [] });
  });

  it('target menor → fecha as mais antigas primeiro, só entre as fecháveis', () => {
    // b é a mais antiga (10 dias), depois a (5), depois c (1)
    const fechaveis = [vaga('a', 5), vaga('b', 10), vaga('c', 1)];
    const r = planejarReconciliacao(3, fechaveis, 1);
    expect(r.criar).toBe(0);
    expect(r.fecharIds).toEqual(['b', 'a']);
  });

  it('target 0 e nenhuma vaga ativa → nada a fazer', () => {
    const r = planejarReconciliacao(0, [], 0);
    expect(r).toEqual({ criar: 0, fecharIds: [] });
  });

  it('target 0 com vagas fecháveis → fecha todas', () => {
    const fechaveis = [vaga('a', 5), vaga('b', 1)];
    const r = planejarReconciliacao(2, fechaveis, 0);
    expect(r.criar).toBe(0);
    expect(r.fecharIds.sort()).toEqual(['a', 'b']);
  });

  it('nenhuma vaga ativa e target positivo → cria todas', () => {
    const r = planejarReconciliacao(0, [], 4);
    expect(r).toEqual({ criar: 4, fecharIds: [] });
  });

  it('REGRESSÃO: vaga já mudou de status (não fechável) → reimport com mesmo target não duplica', () => {
    // Cenário do bug relatado: 1 vaga ativa no total (já em "Em Recrutamento",
    // portanto não está mais na lista de fecháveis), planilha ainda reporta
    // EM ABERTO=1. Antes, contarAbertasAtuais só via as "Em aberto" (0) e
    // recriava uma vaga a cada reimport. Correto: total ativo (1) já bate
    // com o target (1) → não cria nada.
    const r = planejarReconciliacao(1, [], 1);
    expect(r).toEqual({ criar: 0, fecharIds: [] });
  });

  it('target menor que o total, mas sem vagas fecháveis suficientes → fecha só o que pode, nunca mexe nas em processo', () => {
    // total ativo = 3 (2 "em processo", não fecháveis + 1 "Em aberto", fechável)
    // target cai para 1 → precisaria fechar 2, mas só 1 é fechável.
    const fechaveis = [vaga('a', 2)];
    const r = planejarReconciliacao(3, fechaveis, 1);
    expect(r.criar).toBe(0);
    expect(r.fecharIds).toEqual(['a']);
  });
});
