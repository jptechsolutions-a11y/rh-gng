import { NextRequest, NextResponse } from 'next/server';
import {
  AlignmentType, BorderStyle, Document, Footer, Packer, PageNumber, Paragraph, ShadingType,
  Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx';
import { requireSession } from '@/lib/auth/session';
import { carregarAta, dataBrDeIso, type DadosAta } from '@/lib/comite/ata';
import { resumoPedidoAnterior } from '@/lib/comite/historico';
import { fmtTempo, mesValido, nomeMes, rotuloDecisao, type ComiteLancamento } from '@/lib/comite/tipos';

export const dynamic = 'force-dynamic';

const NAVY = '0F1F3D';
const ORANGE = 'F37021';
const LIGHT = 'F1F5F9';
const AMBER = 'FEF3C7';
const BORDER = 'CBD5E1';

const borda = { style: BorderStyle.SINGLE, size: 6, color: BORDER };
const bordas = { top: borda, bottom: borda, left: borda, right: borda };
const margens = { top: 70, bottom: 70, left: 120, right: 120 };

const texto = (t: string, o: { bold?: boolean; size?: number; color?: string; italics?: boolean } = {}) =>
  new TextRun({ text: t, size: o.size ?? 20, bold: o.bold, color: o.color, italics: o.italics });

/** Texto com quebras de linha preservadas (justificativas costumam ter parágrafos). */
function paragrafos(t: string, o: { bold?: boolean; size?: number } = {}): Paragraph[] {
  return t.split(/\r?\n/).map((linha) => new Paragraph({ children: [texto(linha || ' ', o)] }));
}

function linhaKv(rotulo: string, valor: string | Paragraph[], fundo?: string) {
  return new TableRow({
    cantSplit: true,
    children: [
      new TableCell({
        borders: bordas, width: { size: 2600, type: WidthType.DXA }, margins: margens,
        shading: { type: ShadingType.CLEAR, fill: LIGHT },
        children: [new Paragraph({ children: [texto(rotulo, { bold: true })] })],
      }),
      new TableCell({
        borders: bordas, width: { size: 6800, type: WidthType.DXA }, margins: margens,
        shading: fundo ? { type: ShadingType.CLEAR, fill: fundo } : undefined,
        children: typeof valor === 'string' ? paragrafos(valor) : valor,
      }),
    ],
  });
}

function titulo(t: string) {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    shading: { type: ShadingType.CLEAR, fill: NAVY },
    children: [new TextRun({ text: `  ${t}`, bold: true, color: 'FFFFFF', size: 24 })],
  });
}

function blocoPedido(l: ComiteLancamento, n: number): (Paragraph | Table)[] {
  const linhas: TableRow[] = [
    linhaKv('Colaborador', `${l.nome} — matrícula ${l.chapa}`),
    linhaKv('Filial / Função', `${l.filial} — ${l.funcao} (${l.secao})`),
    linhaKv('Turno / Tempo de empresa', `${l.turno} · ${fmtTempo(l.tempoMeses)}`),
    linhaKv('Medidas disciplinares', `${l.suspensoes} suspensão(ões) · ${l.advertencias} advertência(s)`),
    linhaKv('Justificativa do pedido', l.justificativa),
    linhaKv(
      'Decisão do comitê',
      l.decisao
        ? `${rotuloDecisao(l.decisao)}${l.decididoPor ? ` por ${l.decididoPor}` : ''}`
        : 'Pendente (sem decisão registrada)',
    ),
  ];
  if (l.decisao === 'nao_aprovado') linhas.push(linhaKv('Motivo da não aprovação', l.decisaoMotivo ?? '—'));
  if (l.historico.length > 0) {
    linhas.push(
      linhaKv(
        'Pedidos anteriores não aprovados',
        l.historico.flatMap((p) => paragrafos(`• ${resumoPedidoAnterior(p, nomeMes)}`)),
        AMBER,
      ),
    );
  }
  return [
    new Paragraph({ spacing: { before: 200, after: 80 }, keepNext: true, children: [texto(`${n}. ${l.nome}`, { bold: true, size: 22, color: ORANGE })] }),
    new Table({ width: { size: 9400, type: WidthType.DXA }, columnWidths: [2600, 6800], rows: linhas }),
  ];
}

function montar(d: DadosAta): Document {
  const filhos: (Paragraph | Table)[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [texto('GRUPO PERLOG — GENTE & GESTÃO', { size: 18, color: '64748B' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [texto('ATA DO COMITÊ DE DESLIGAMENTO', { bold: true, size: 32, color: NAVY })] }),
    new Table({
      width: { size: 9400, type: WidthType.DXA }, columnWidths: [2600, 6800],
      rows: [
        linhaKv('Mês de referência', nomeMes(d.mes)),
        linhaKv('Data do comitê', dataBrDeIso(d.dataComite)),
        linhaKv('Pedidos analisados', `${d.resumo.total} — ${d.resumo.aprovados} aprovado(s), ${d.resumo.naoAprovados} não aprovado(s), ${d.resumo.pendentes} pendente(s)`),
      ],
    }),
    titulo('Participantes'),
    ...(d.participantes.length > 0
      ? d.participantes.map((p, i) => new Paragraph({ spacing: { after: 40 }, children: [texto(`${i + 1}. ${p}`)] }))
      : [new Paragraph({ children: [texto('Nenhum participante informado.', { italics: true, color: '64748B' })] })]),
    titulo('Pedidos e decisões'),
    ...(d.lancamentos.length > 0
      ? d.lancamentos.flatMap((l, i) => blocoPedido(l, i + 1))
      : [new Paragraph({ children: [texto('Nenhum pedido neste mês.', { italics: true, color: '64748B' })] })]),
  ];

  return new Document({
    creator: 'Conecta G&G',
    title: `Ata do Comitê de Desligamento — ${nomeMes(d.mes)}`,
    sections: [{
      properties: { page: { margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              texto('Ata do Comitê de Desligamento — ', { size: 16, color: '64748B' }),
              texto(nomeMes(d.mes), { size: 16, color: '64748B' }),
              texto('  ·  página ', { size: 16, color: '64748B' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '64748B' }),
            ],
          })],
        }),
      },
      children: filhos,
    }],
  });
}

export async function GET(req: NextRequest) {
  const s = await requireSession();
  if (s.perfil !== 'admin') return NextResponse.json({ erro: 'apenas o administrador exporta a ata' }, { status: 403 });
  const mes = req.nextUrl.searchParams.get('mes');
  if (!mes || !mesValido(mes)) return NextResponse.json({ erro: 'mês inválido' }, { status: 400 });

  const dados = await carregarAta(s, mes);
  const buffer = await Packer.toBuffer(montar(dados));
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="Ata_Comite_Desligamento_${mes}.docx"`,
      'Cache-Control': 'no-store',
    },
  });
}
