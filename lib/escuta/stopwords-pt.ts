// Stopwords PT-BR: artigos, preposicoes, pronomes, conectivos,
// verbos auxiliares mais comuns. Tudo sem acento (a comparacao acontece
// apos normalizacao NFD na funcao de tokenizar).
export const STOPWORDS_PT = new Set<string>([
  // artigos / contracoes
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas',
  'ao', 'aos', 'na', 'no', 'nas', 'nos', 'da', 'do', 'das', 'dos',
  'pela', 'pelo', 'pelas', 'pelos', 'numa', 'num', 'dum', 'duma',
  // preposicoes / conjuncoes
  'de', 'em', 'por', 'para', 'pra', 'com', 'sem', 'sob', 'sobre',
  'ate', 'desde', 'entre', 'apos', 'ante', 'contra', 'tras',
  'e', 'ou', 'mas', 'porem', 'todavia', 'contudo', 'que', 'se',
  'como', 'porque', 'pois', 'entao', 'logo', 'portanto', 'assim',
  'tambem', 'ja', 'ainda', 'so', 'apenas', 'mesmo', 'tao',
  // pronomes
  'eu', 'tu', 'ele', 'ela', 'nos', 'vos', 'eles', 'elas',
  'me', 'te', 'se', 'lhe', 'lhes', 'mim', 'ti', 'si',
  'meu', 'minha', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas',
  'seu', 'sua', 'seus', 'suas', 'nosso', 'nossa', 'nossos', 'nossas',
  'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas',
  'isto', 'isso', 'aquilo', 'aquele', 'aquela', 'aqueles', 'aquelas',
  'qual', 'quais', 'quem', 'cujo', 'cuja', 'cujos', 'cujas',
  // adverbios / interjeicoes comuns
  'aqui', 'ali', 'la', 'ca', 'agora', 'hoje', 'ontem', 'amanha',
  'sempre', 'nunca', 'jamais', 'talvez', 'sim', 'nao', 'muito', 'pouco',
  'mais', 'menos', 'bem', 'mal', 'todo', 'toda', 'todos', 'todas',
  'algum', 'alguma', 'alguns', 'algumas', 'nenhum', 'nenhuma',
  'outro', 'outra', 'outros', 'outras', 'cada', 'qualquer', 'quaisquer',
  // verbos auxiliares (ser, estar, ter, haver, ir, fazer) - formas comuns
  'ser', 'sou', 'es', 'sao', 'somos', 'era', 'eram', 'foi', 'fui',
  'foram', 'fomos', 'sera', 'serao', 'seja', 'sejam',
  'estar', 'esta', 'estao', 'estou', 'estamos', 'estive', 'esteve',
  'estava', 'estavam', 'estiver', 'estejam',
  'ter', 'tem', 'tenho', 'temos', 'tinha', 'tinham', 'teve', 'tive',
  'tivemos', 'teremos', 'tera', 'tenha', 'tenham',
  'haver', 'ha', 'havia', 'houve', 'houver', 'havera', 'haja',
  'ir', 'vai', 'vou', 'vamos', 'vao', 'foi', 'foram', 'ia', 'iam',
  'fazer', 'faz', 'faco', 'fazem', 'fazia', 'fez', 'fizemos', 'fizeram',
  // outros
  'pode', 'podem', 'podia', 'poder', 'deve', 'devem', 'dever',
  'sao', 'esta', 'fica', 'ficar', 'ficou', 'ficam',
  'coisa', 'coisas', 'gente', 'pessoa', 'pessoas',
]);
