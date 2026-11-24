import { describe, it, expect } from 'vitest';
import { limparParticipantes, participantesDoBanco, resumirDecisoes } from './ata-util';

describe('limparParticipantes', () => {
  it('tira espaços, vazios e repetidos (sem diferenciar maiúsculas), mantendo a ordem', () => {
    expect(limparParticipantes(['  Ana  Souza ', '', 'ana souza', 'Bruno', '   '])).toEqual(['Ana Souza', 'Bruno']);
  });
  it('lista vazia', () => expect(limparParticipantes([])).toEqual([]));
});

describe('participantesDoBanco', () => {
  it('aceita só textos', () => expect(participantesDoBanco(['A', 1, null, 'B'])).toEqual(['A', 'B']));
  it('valor que não é lista vira vazio', () => {
    expect(participantesDoBanco(null)).toEqual([]);
    expect(participantesDoBanco('A')).toEqual([]);
  });
});

describe('resumirDecisoes', () => {
  it('conta aprovados, não aprovados e pendentes', () => {
    expect(resumirDecisoes(['aprovado', 'nao_aprovado', null, 'aprovado'])).toEqual({
      total: 4, aprovados: 2, naoAprovados: 1, pendentes: 1,
    });
  });
  it('sem pedidos', () => expect(resumirDecisoes([])).toEqual({ total: 0, aprovados: 0, naoAprovados: 0, pendentes: 0 }));
});
