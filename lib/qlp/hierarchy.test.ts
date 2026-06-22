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
  it('gerente NÃO pode liderar gerente', () => {
    expect(() => assertCanLead('gerente', 'gerente')).toThrow();
  });
  it('tier inválido lança erro', () => {
    expect(() => assertCanLead('foo' as any, 'base')).toThrow();
    expect(() => assertCanLead('gerente', 'bar' as any)).toThrow();
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
