import { describe, it, expect } from 'vitest';
import { autoclassify } from './autoclassify';

describe('autoclassify - tier e nivel', () => {
  it('GERENTE NAC. DE TRANSPORTE → gerente/nacional', () => {
    expect(autoclassify('GERENTE NAC. DE TRANSPORTE')).toMatchObject({
      tier: 'gerente',
      nivel: 'nacional',
    });
  });
  it('GERENTE REGIONAL DE OPERACOES → gerente/regional', () => {
    expect(autoclassify('GERENTE REGIONAL DE OPERACOES')).toMatchObject({
      tier: 'gerente',
      nivel: 'regional',
    });
  });
  it('GERENTE DE PLANEJAMENTO LOGISTICO → gerente/regional (default)', () => {
    expect(autoclassify('GERENTE DE PLANEJAMENTO LOGISTICO')).toMatchObject({
      tier: 'gerente',
      nivel: 'regional',
    });
  });
  it('SUBGERENTE DE OPERACOES → subgerente', () => {
    expect(autoclassify('SUBGERENTE DE OPERACOES').tier).toBe('subgerente');
  });
  it('COORD. NACIONAL DE GENTE E GESTAO → coord/nacional', () => {
    expect(autoclassify('COORD. NACIONAL DE GENTE E GESTAO')).toMatchObject({
      tier: 'coord',
      nivel: 'nacional',
    });
  });
  it('COORD. REGIONAL DE TI - I → coord/regional', () => {
    expect(autoclassify('COORD. REGIONAL DE TI - I')).toMatchObject({
      tier: 'coord',
      nivel: 'regional',
    });
  });
  it('COORD. DE LOGISTICA → coord/regional (default)', () => {
    expect(autoclassify('COORD. DE LOGISTICA')).toMatchObject({
      tier: 'coord',
      nivel: 'regional',
    });
  });
  it('SUPERVISOR(A) DE LOGISTICA II → supervisor/ii', () => {
    expect(autoclassify('SUPERVISOR(A) DE LOGISTICA II')).toMatchObject({
      tier: 'supervisor',
      nivel: 'ii',
    });
  });
  it('SUPERVISOR(A) DE TRANSPORTE → supervisor/i (default)', () => {
    expect(autoclassify('SUPERVISOR(A) DE TRANSPORTE')).toMatchObject({
      tier: 'supervisor',
      nivel: 'i',
    });
  });
  it('ENC. DE DEPOSITO → supervisor/i', () => {
    expect(autoclassify('ENC. DE DEPOSITO')).toMatchObject({
      tier: 'supervisor',
      nivel: 'i',
    });
  });
  it('ASSIST. ADMINISTRATIVO → base', () => {
    expect(autoclassify('ASSIST. ADMINISTRATIVO').tier).toBe('base');
  });
  it('MOTORISTA CARRETEIRO → base', () => {
    expect(autoclassify('MOTORISTA CARRETEIRO').tier).toBe('base');
  });
});

describe('autoclassify - trilha', () => {
  it('LOGISTICA → logistica', () => {
    expect(autoclassify('SUPERVISOR(A) DE LOGISTICA I').trilha).toBe('logistica');
  });
  it('MOTORISTA → transporte', () => {
    expect(autoclassify('MOTORISTA').trilha).toBe('transporte');
  });
  it('ABASTECIMENTO → abastecimento', () => {
    expect(autoclassify('COORD. DE ABASTECIMENTO').trilha).toBe('abastecimento');
  });
  it('PREVENCAO → prevencao', () => {
    expect(autoclassify('AUX. DE PREVENCAO').trilha).toBe('prevencao');
  });
  it('GENTE E GESTAO → gg', () => {
    expect(autoclassify('ANALISTA DE GENTE E GESTAO').trilha).toBe('gg');
  });
  it('MANUTENCAO → manutencao', () => {
    expect(autoclassify('TECNICO(A) DE MANUTENCAO I').trilha).toBe('manutencao');
  });
  it('TI → ti', () => {
    expect(autoclassify('TECNICO(A) DE SUPORTE - TI').trilha).toBe('ti');
  });
  it('FINANCEIRO → financ', () => {
    expect(autoclassify('ASSIST. FINANCEIRO').trilha).toBe('financ');
  });
  it('VIGILANTE → prevencao', () => {
    expect(autoclassify('VIGILANTE').trilha).toBe('prevencao');
  });
  it('JARDINEIRO → manutencao', () => {
    expect(autoclassify('JARDINEIRO(A)').trilha).toBe('manutencao');
  });
  it('função estranha → outros', () => {
    expect(autoclassify('XPTO BLABLA').trilha).toBe('outros');
  });
});

describe('autoclassify - cobertura do quadro Perlog real', () => {
  const FUNCOES_REAIS = [
    'AJUDANTE DE ENTREGA',
    'ANALISTA ADMINISTRATIVO JUNIOR',
    'ANALISTA DE ABASTECIMENTO',
    'ANALISTA DE ABASTECIMENTO PLENO',
    'ANALISTA DE GENTE E GESTAO',
    'ANALISTA DE GENTE E GESTAO PLENO',
    'ANALISTA DE LOGISTICA',
    'ANALISTA DE LOGISTICA E WMS',
    'ANALISTA DE LOGISTICA PLENO',
    'ANALISTA DE LOGISTICA SENIOR',
    'ANALISTA DE ROTEIRIZACAO',
    'ANALISTA DE TRANSPORTE',
    'ANALISTA FINANCEIRO',
    'APRENDIZ ASSISTENTE ADMINISTRATIVO',
    'APRENDIZ AUXILIAR ADMINISTRATIVO',
    'APRENDIZ AUXILIAR DE LOGISTICA',
    'APRENDIZ VENDEDOR DE COMERCIO VAREJISTA',
    'ASSIST. ADMINISTRATIVO',
    'ASSIST. DE ABASTECIMENTO',
    'ASSIST. DE GENTE E GESTAO',
    'ASSIST. DE LOGISTICA',
    'ASSIST. DE PREVENCAO DE PERDAS',
    'ASSIST. FINANCEIRO',
    'AUX. ADMINISTRATIVO',
    'AUX. DE ARMAZEM',
    'AUX. DE CARGA E DESCARGA',
    'AUX. DE COZINHA',
    'AUX. DE GENTE E GESTAO',
    'AUX. DE HIGIENIZACAO',
    'AUX. DE MANUTENCAO',
    'AUX. DE MOVIMENTACAO',
    'AUX. DE PREVENCAO',
    'AUX. DE SERV.GERAIS',
    'AUX. DE SUPORTE T.I.',
    'CONFERENTE',
    'COORD. DE ABASTECIMENTO',
    'COORD. DE AUTOMACAO LOGISTICA',
    'COORD. DE DEMANDA LOGISTICA',
    'COORD. DE LOGISTICA',
    'COORD. DE LOGISTICA E WMS',
    'COORD. DE NOVOS NEGOCIOS',
    'COORD. DE TRANSPORTE',
    'COORD. NACIONAL DE GENTE E GESTAO',
    'COORD. REGIONAL DE PREVENCAO DE PERDAS',
    'COORD. REGIONAL DE TI - I',
    'COORD. REGIONAL DE TRANSPORTES',
    'COZINHEIRO(A)',
    'ENC. DE DEPOSITO',
    'ENC. DE FINANCEIRO',
    'ENC. REGIONAL DE MANUTENCAO',
    'ESPECIALISTA EM ELETROTECNICA',
    'GERENCIADOR(A) DE LIMPEZA E CONSERVACAO',
    'GERENTE ADMINISTRATIVO CANAL INDIRETO',
    'GERENTE DE OPERACOES',
    'GERENTE DE PLANEJAMENTO LOGISTICO',
    'GERENTE DE PREVENCAO DE PERDAS - ATACADO',
    'GERENTE NAC. DE ABASTECIMENTO',
    'GERENTE NAC. DE OPERACOES C.I.',
    'GERENTE NAC. DE TRANSPORTE',
    'GERENTE REGIONAL DE OPERACOES',
    'JARDINEIRO(A)',
    'MOTORISTA',
    'MOTORISTA CARRETEIRO',
    'MOTORISTA CARRETEIRO INTERMUNICIPAL',
    'MOTORISTA INTERMUNICIPAL ',
    'NUTRICIONISTA',
    'OP. DE EMPILHADEIRA',
    'OPERADOR(A) DE ABASTECIMENTO',
    'PORTEIRO(A)',
    'SUBGERENTE DE OPERACOES',
    'SUPERVISOR(A) DE ABASTECIMENTO',
    'SUPERVISOR(A) DE GENTE E GESTAO',
    'SUPERVISOR(A) DE LOGISTICA I',
    'SUPERVISOR(A) DE LOGISTICA II',
    'SUPERVISOR(A) DE MONITORAMENTO',
    'SUPERVISOR(A) DE PREVENCAO DE PERDAS I',
    'SUPERVISOR(A) DE PREVENCAO DE PERDAS II',
    'SUPERVISOR(A) DE TRANSPORTE',
    'TECNICO(A) DE MANUTENCAO I',
    'TECNICO(A) DE MANUTENCAO II',
    'TECNICO(A) DE SUPORTE - TI',
    'TECNICO(A) EM SEGURANCA NO TRABALHO',
    'TECNICO(A) EM SEGURANCA NO TRABALHO PLENO',
    'VIGILANTE',
    'ZELADOR(A)',
  ];

  it('classifica todas as 85 funções sem null/undefined', () => {
    for (const f of FUNCOES_REAIS) {
      const c = autoclassify(f);
      expect(c.tier, `função: ${f}`).toMatch(/^(gerente|subgerente|coord|supervisor|base)$/);
      expect(c.trilha, `função: ${f}`).toMatch(
        /^(logistica|transporte|abastecimento|prevencao|gg|manutencao|ti|financ|outros)$/,
      );
    }
  });

  it('distribuição: ≥1 gerente, ≥1 subgerente, ≥3 coord, ≥3 supervisor, ≥40 base', () => {
    const counts: Record<string, number> = {
      gerente: 0,
      subgerente: 0,
      coord: 0,
      supervisor: 0,
      base: 0,
    };
    for (const f of FUNCOES_REAIS) counts[autoclassify(f).tier]++;
    expect(counts.gerente).toBeGreaterThanOrEqual(1);
    expect(counts.subgerente).toBeGreaterThanOrEqual(1);
    expect(counts.coord).toBeGreaterThanOrEqual(3);
    expect(counts.supervisor).toBeGreaterThanOrEqual(3);
    expect(counts.base).toBeGreaterThanOrEqual(40);
  });
});
