import { describe, expect, it } from 'vitest';
import { atribuirUsuarios, senhaGestor, usuarioBase } from './gestores';

describe('usuarios de gestor', () => {
  it('primeiro.ultimo em minúsculas', () => {
    expect(usuarioBase('JULIANO PATRICK DA SILVA CORREA')).toBe('juliano.correa');
  });
  it('ignora acento e partículas no fim', () => {
    expect(usuarioBase('João Pedro de Souza')).toBe('joao.souza');
    expect(usuarioBase('Maria da Conceição')).toBe('maria.conceicao');
  });
  it('nome de uma palavra só', () => {
    expect(usuarioBase('Madonna')).toBe('madonna');
  });
  it('senha = 4 últimos da matrícula + filial + primeiro nome', () => {
    expect(senhaGestor('78900004', 230, 'Juliano Patrick Correa')).toBe('0004230juliano');
    expect(senhaGestor('26401140', '020', 'Ágata Lima')).toBe('114020agata');
  });
  it('repetidos ganham número', () => {
    const r = atribuirUsuarios(['maria.silva', 'maria.silva', 'ana.lima'], new Set(['ana.lima']));
    expect(r.map((x) => x.usuario)).toEqual(['maria.silva', 'maria.silva2', 'ana.lima2']);
    expect(r.map((x) => x.repetido)).toEqual([false, true, true]);
  });
});
