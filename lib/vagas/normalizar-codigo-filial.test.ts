import { describe, it, expect } from 'vitest';
import { normalizarCodigoFilial } from './normalizar-codigo-filial';

describe('normalizarCodigoFilial', () => {
  it('remove zero à esquerda', () => {
    expect(normalizarCodigoFilial('020')).toBe('20');
  });

  it('remove múltiplos zeros à esquerda', () => {
    expect(normalizarCodigoFilial('007')).toBe('7');
  });

  it('código sem zero à esquerda fica igual', () => {
    expect(normalizarCodigoFilial('264')).toBe('264');
  });

  it('"020" e "20" normalizam pro mesmo valor', () => {
    expect(normalizarCodigoFilial('020')).toBe(normalizarCodigoFilial('20'));
  });

  it('não mexe em código totalmente zero (caso degenerado, mantém um dígito)', () => {
    expect(normalizarCodigoFilial('000')).toBe('0');
  });
});
