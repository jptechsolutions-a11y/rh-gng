import type { PerguntaInput, TipoPergunta, Valor } from './tipos';

const TIPOS: TipoPergunta[] = ['unica', 'multipla', 'texto', 'nota'];

/** Valida e normaliza a definição de perguntas vinda do editor. Lança Error com mensagem amigável. */
export function validarPerguntas(perguntas: PerguntaInput[]): PerguntaInput[] {
  if (perguntas.length === 0) throw new Error('adicione pelo menos uma pergunta');
  if (perguntas.length > 50) throw new Error('máximo de 50 perguntas');
  return perguntas.map((p, i) => {
    const texto = p.texto.trim();
    if (!texto) throw new Error(`pergunta ${i + 1}: informe o texto`);
    if (!TIPOS.includes(p.tipo)) throw new Error(`pergunta ${i + 1}: tipo inválido`);
    let opcoes: string[] = [];
    if (p.tipo === 'unica' || p.tipo === 'multipla') {
      opcoes = p.opcoes.map((o) => o.trim()).filter(Boolean);
      if (opcoes.length < 2) throw new Error(`pergunta ${i + 1}: informe pelo menos 2 opções`);
      if (new Set(opcoes).size !== opcoes.length) throw new Error(`pergunta ${i + 1}: opções repetidas`);
    }
    return { texto, tipo: p.tipo, obrigatoria: !!p.obrigatoria, opcoes };
  });
}

export interface PerguntaDef {
  id: string;
  texto: string;
  tipo: string;
  obrigatoria: boolean;
  opcoes: string[];
}

/** Valida as respostas enviadas contra as perguntas da pesquisa; devolve só os itens válidos (não vazios). */
export function validarRespostas(
  perguntas: PerguntaDef[],
  respostas: Record<string, Valor | null | undefined>,
): { perguntaId: string; valor: Valor }[] {
  const itens: { perguntaId: string; valor: Valor }[] = [];
  for (const p of perguntas) {
    const v = respostas[p.id];
    const vazio =
      v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0);
    if (vazio) {
      if (p.obrigatoria) throw new Error(`responda a pergunta: "${p.texto}"`);
      continue;
    }
    if (p.tipo === 'unica') {
      if (typeof v !== 'string' || !p.opcoes.includes(v)) throw new Error(`resposta inválida: "${p.texto}"`);
      itens.push({ perguntaId: p.id, valor: v });
    } else if (p.tipo === 'multipla') {
      if (!Array.isArray(v) || !v.every((x) => typeof x === 'string' && p.opcoes.includes(x))) {
        throw new Error(`resposta inválida: "${p.texto}"`);
      }
      itens.push({ perguntaId: p.id, valor: Array.from(new Set(v)) });
    } else if (p.tipo === 'nota') {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error(`nota inválida: "${p.texto}"`);
      itens.push({ perguntaId: p.id, valor: n });
    } else {
      if (typeof v !== 'string') throw new Error(`resposta inválida: "${p.texto}"`);
      itens.push({ perguntaId: p.id, valor: v.trim().slice(0, 2000) });
    }
  }
  return itens;
}
