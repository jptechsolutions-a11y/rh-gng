import { describe, it, expect } from 'vitest';
import { assertCanLead, escopoCobreFilial } from './hierarchy';

describe('assertCanLead', () => {
  it('supervisor pode liderar base', () => {
    expect(() => assertCanLead('supervisor', 'base')).not.toThrow();
  });
  it('supervisor NÃO pode liderar supervisor', () => {
    expect(() => assertCanLead('supervisor', 'supervisor')).toThrow();
  });
  it('supervisor NÃO pode liderar coord', () => {
    expect(() => assertCanLead('supervisor', 'coord')).toThrow();
  });
  it('supervisor NÃO pode liderar gerente', () => {
    expect(() => assertCanLead('supervisor', 'gerente')).toThrow();
  });
  it('coord pode liderar supervisor', () => {
    expect(() => assertCanLead('coord', 'supervisor')).not.toThrow();
  });
  it('coord pode liderar base', () => {
    expect(() => assertCanLead('coord', 'base')).not.toThrow();
  });
  it('coord NÃO pode liderar coord', () => {
    expect(() => assertCanLead('coord', 'coord')).toThrow();
  });
  it('coord NÃO pode liderar subgerente', () => {
    expect(() => assertCanLead('coord', 'subgerente')).toThrow();
  });
  it('subgerente lidera coord, supervisor, base', () => {
    expect(() => assertCanLead('subgerente', 'coord')).not.toThrow();
    expect(() => assertCanLead('subgerente', 'supervisor')).not.toThrow();
    expect(() => assertCanLead('subgerente', 'base')).not.toThrow();
  });
  it('subgerente NÃO lidera subgerente nem gerente', () => {
    expect(() => assertCanLead('subgerente', 'subgerente')).toThrow();
    expect(() => assertCanLead('subgerente', 'gerente')).toThrow();
  });
  it('gerente lidera tudo abaixo', () => {
    expect(() => assertCanLead('gerente', 'subgerente')).not.toThrow();
    expect(() => assertCanLead('gerente', 'coord')).not.toThrow();
    expect(() => assertCanLead('gerente', 'supervisor')).not.toThrow();
    expect(() => assertCanLead('gerente', 'base')).not.toThrow();
  });
  it('gerente sem qualificação NÃO pode liderar gerente', () => {
    expect(() => assertCanLead('gerente', 'gerente')).toThrow();
  });
  it('gerente NACIONAL pode liderar gerente REGIONAL (mesmo tier)', () => {
    expect(() =>
      assertCanLead('gerente', 'gerente', { liderNivel: 'nacional', lideradoNivel: 'regional' }),
    ).not.toThrow();
  });
  it('gerente NACIONAL não lidera gerente NACIONAL', () => {
    expect(() =>
      assertCanLead('gerente', 'gerente', { liderNivel: 'nacional', lideradoNivel: 'nacional' }),
    ).toThrow();
  });
  it('gerente REGIONAL não lidera gerente REGIONAL', () => {
    expect(() =>
      assertCanLead('gerente', 'gerente', { liderNivel: 'regional', lideradoNivel: 'regional' }),
    ).toThrow();
  });
  it('gerente REGIONAL pode liderar gerente MULTI (mesmo tier)', () => {
    expect(() =>
      assertCanLead('gerente', 'gerente', { liderNivel: 'regional', lideradoNivel: 'multi' }),
    ).not.toThrow();
  });
  it('gerente REGIONAL pode liderar gerente FILIAL (mesmo tier)', () => {
    expect(() =>
      assertCanLead('gerente', 'gerente', { liderNivel: 'regional', lideradoNivel: 'filial' }),
    ).not.toThrow();
  });
  it('gerente REGIONAL não lidera gerente NACIONAL (mesmo tier)', () => {
    expect(() =>
      assertCanLead('gerente', 'gerente', { liderNivel: 'regional', lideradoNivel: 'nacional' }),
    ).toThrow();
  });
  it('coord NACIONAL pode liderar coord REGIONAL', () => {
    expect(() =>
      assertCanLead('coord', 'coord', { liderNivel: 'nacional', lideradoNivel: 'regional' }),
    ).not.toThrow();
  });
  it('coord REGIONAL não lidera coord NACIONAL', () => {
    expect(() =>
      assertCanLead('coord', 'coord', { liderNivel: 'regional', lideradoNivel: 'nacional' }),
    ).toThrow();
  });
  it('encarregado pode liderar base', () => {
    expect(() => assertCanLead('encarregado', 'base')).not.toThrow();
  });
  it('encarregado NÃO pode liderar encarregado', () => {
    expect(() => assertCanLead('encarregado', 'encarregado')).toThrow();
  });
  it('encarregado NÃO pode liderar supervisor', () => {
    expect(() => assertCanLead('encarregado', 'supervisor')).toThrow();
  });
  it('encarregado NÃO pode liderar coord', () => {
    expect(() => assertCanLead('encarregado', 'coord')).toThrow();
  });
  it('coord pode liderar encarregado', () => {
    expect(() => assertCanLead('coord', 'encarregado')).not.toThrow();
  });
  it('subgerente pode liderar encarregado', () => {
    expect(() => assertCanLead('subgerente', 'encarregado')).not.toThrow();
  });
  it('gerente pode liderar encarregado', () => {
    expect(() => assertCanLead('gerente', 'encarregado')).not.toThrow();
  });
  it('tier inválido lança erro', () => {
    expect(() => assertCanLead('foo', 'base')).toThrow();
    expect(() => assertCanLead('gerente', 'bar')).toThrow();
  });
});

describe('escopoCobreFilial', () => {
  it('nacional cobre qualquer filial', () => {
    expect(escopoCobreFilial({ escopoNacional: true, filiaisEscopo: [] }, 'qualquer')).toBe(true);
    expect(escopoCobreFilial({ escopoNacional: true, filiaisEscopo: ['x'] }, 'qualquer')).toBe(true);
  });
  it('regional só cobre filiais listadas', () => {
    expect(escopoCobreFilial({ escopoNacional: false, filiaisEscopo: ['a', 'b'] }, 'a')).toBe(true);
    expect(escopoCobreFilial({ escopoNacional: false, filiaisEscopo: ['a', 'b'] }, 'c')).toBe(false);
  });
  it('regional sem filiais não cobre nada', () => {
    expect(escopoCobreFilial({ escopoNacional: false, filiaisEscopo: [] }, 'a')).toBe(false);
  });
});
