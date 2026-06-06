import type { EscutaEtapa } from '@/db/schema';

export const ROTEIRO_FALLBACK = {
  heroTitulo: 'Gente e Gestão',
  heroSubtitulo: 'SUA ORGANIZAÇÃO FAZ TODA A DIFERENÇA',
  heroFrase: 'Conecte quem conecta. Diálogo que transforma. Juntos, construímos algo melhor.',
  bannerTexto: 'FORMULÁRIO CONECTA G&G — Conecte que irá fazer a diferença',
  etapas: [
    { ordem: 1, titulo: 'PREPARAR UMA SALA',
      descricao: 'Organizar o ambiente antes da reunião: cadeiras, materiais, privacidade.' },
    { ordem: 2, titulo: 'REUNIR TODOS OS MEMBROS DA TURMA',
      descricao: 'Garantir a presença de todos os integrantes no momento da reunião.' },
    { ordem: 3, titulo: 'LEVAR UMA LISTA PARA ANOTAÇÃO DE AUSÊNCIAS',
      descricao: 'Registrar quem não pôde comparecer e justificar as ausências.' },
    { ordem: 4, titulo: 'LIDERAR A CONDUÇÃO DA REUNIÃO NO ROTEIRO ABAIXO',
      descricao: 'Seguir o formulário Conecta G&G como guia da condução.' },
    { ordem: 5, titulo: 'REGISTRAR A PERCEPÇÃO DA TURMA',
      descricao: 'Anotar os pontos levantados pelo grupo durante a avaliação.' },
    { ordem: 6, titulo: 'ACOLHER, OUVIR, IDENTIFICAR E AGIR',
      descricao: 'Conduzir com escuta ativa: acolher para integrar, ouvir para entender, identificar para evoluir, agir para transformar.' },
  ] satisfies EscutaEtapa[],
};
