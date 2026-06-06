export type PilarChave = 'adaptacao' | 'alimentacao' | 'trabalho' | 'comunicacao' | 'sugestoes';

export const PILARES_FALLBACK = [
  { id: 1, ordem: 1, nome: 'Adaptação e Bem-Estar Geral', icone: 'adaptacao' as PilarChave,
    perguntas: [
      'Como você tem se sentido adaptado(a) ao trabalho?',
      'O ambiente e as condições gerais atendem o esperado?',
      'Há algo que está dificultando seu bem-estar?',
    ] },
  { id: 2, ordem: 2, nome: 'Alimentação e Refeições', icone: 'alimentacao' as PilarChave,
    perguntas: [
      'Como avalia a qualidade das refeições?',
      'O tempo destinado às refeições é adequado?',
      'Há alguma sugestão sobre cardápio ou estrutura?',
    ] },
  { id: 3, ordem: 3, nome: 'Trabalho e Atividades', icone: 'trabalho' as PilarChave,
    perguntas: [
      'As atividades estão claras e bem distribuídas?',
      'Você tem os recursos necessários para executar seu trabalho?',
      'Existe algum ponto que poderia ser melhorado na rotina?',
    ] },
  { id: 4, ordem: 4, nome: 'Comunicação e Relacionamento', icone: 'comunicacao' as PilarChave,
    perguntas: [
      'Como está a comunicação com a liderança?',
      'E com os colegas de equipe?',
      'Sente-se ouvido(a) quando precisa expor algo?',
    ] },
  { id: 5, ordem: 5, nome: 'Sugestões e Melhorias', icone: 'sugestoes' as PilarChave,
    perguntas: [
      'O que podemos melhorar como empresa?',
      'Há alguma ideia que gostaria de propor?',
      'Algum reconhecimento ou agradecimento que queira registrar?',
    ] },
];
