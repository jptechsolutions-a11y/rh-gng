import { describe, it, expect } from 'vitest';
import {
  NovaReuniaoSchema,
  ConfigRoteiroSchema,
  ConfigPilaresSchema,
} from '../validators';

const reuniaoValida = {
  turma: 'Turma A',
  dataReuniao: '2026-06-06',
  responsavel: 'Maria',
  percepcoes: { '1': 'ok' },
  percepcaoFinal: 'tudo bem',
  fotos: [{ path: 'x/y/1.jpg', size: 1024 }],
  presenca: [{ nome: 'João', funcao: 'op', presente: true }],
};

describe('NovaReuniaoSchema', () => {
  it('aceita payload mínimo válido', () => {
    expect(() => NovaReuniaoSchema.parse(reuniaoValida)).not.toThrow();
  });
  it('rejeita data fora do formato YYYY-MM-DD', () => {
    expect(() => NovaReuniaoSchema.parse({ ...reuniaoValida, dataReuniao: '06/06/2026' })).toThrow();
  });
  it('rejeita zero fotos', () => {
    expect(() => NovaReuniaoSchema.parse({ ...reuniaoValida, fotos: [] })).toThrow();
  });
  it('rejeita mais de 3 fotos', () => {
    const f = [1, 2, 3, 4].map((n) => ({ path: `p/${n}.jpg`, size: 1 }));
    expect(() => NovaReuniaoSchema.parse({ ...reuniaoValida, fotos: f })).toThrow();
  });
  it('rejeita presença vazia', () => {
    expect(() => NovaReuniaoSchema.parse({ ...reuniaoValida, presenca: [] })).toThrow();
  });
  it('rejeita percepção final vazia', () => {
    expect(() => NovaReuniaoSchema.parse({ ...reuniaoValida, percepcaoFinal: '' })).toThrow();
  });
});

describe('ConfigRoteiroSchema', () => {
  it('exige ao menos uma etapa', () => {
    expect(() => ConfigRoteiroSchema.parse({
      heroTitulo: 't', heroSubtitulo: 's', heroFrase: 'f', bannerTexto: 'b', etapas: [],
    })).toThrow();
  });
});

describe('ConfigPilaresSchema', () => {
  it('exige exatamente 5 pilares', () => {
    expect(() => ConfigPilaresSchema.parse({ pilares: [] })).toThrow();
  });
});
