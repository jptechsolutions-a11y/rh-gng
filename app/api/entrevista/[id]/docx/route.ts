import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType,
  HeadingLevel, BorderStyle, WidthType, ShadingType, Header, Footer, PageNumber, ImageRun,
} from 'docx';
import { requireSession } from '@/lib/auth/session';
import { getEntrevista } from '@/actions/entrevistas';
import { db, schema } from '@/db/client';
import { getCriterios, getRoteiro } from '@/db/queries/config';

export const dynamic = 'force-dynamic';

const PERLOG_ORANGE = 'F37021';
const PERLOG_NAVY = '0F1F3D';
const LIGHT_GRAY = 'F1F5F9';
const BORDER_GRAY = 'CBD5E1';

const border = { style: BorderStyle.SINGLE, size: 6, color: BORDER_GRAY };
const allBorders = { top: border, bottom: border, left: border, right: border };

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}
function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
function fmtCpf(c: string) {
  return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function sectionTitle(n: string, title: string) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    shading: { type: ShadingType.CLEAR, fill: PERLOG_NAVY },
    children: [
      new TextRun({ text: `  ${n} — ${title}`, bold: true, color: 'FFFFFF', size: 24 }),
    ],
  });
}

function kvRow(label: string, value: string) {
  return new TableRow({
    children: [
      new TableCell({
        borders: allBorders,
        width: { size: 3200, type: WidthType.DXA },
        shading: { type: ShadingType.CLEAR, fill: LIGHT_GRAY },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })],
      }),
      new TableCell({
        borders: allBorders,
        width: { size: 5800, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: value || '—', size: 20 })] })],
      }),
    ],
  });
}

function kvTable(rows: Array<[string, string]>) {
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: [3200, 5800],
    rows: rows.map(([k, v]) => kvRow(k, v)),
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const e = await getEntrevista(id);
  if (!e) return NextResponse.json({ erro: 'Entrevista não encontrada' }, { status: 404 });

  const [criterios, roteiro, filialRows] = await Promise.all([
    getCriterios(),
    getRoteiro(e.cargoPretendido ?? 'TODOS'),
    db.select({ codigo: schema.filiais.codigo, nome: schema.filiais.nome })
      .from(schema.filiais).where(eq(schema.filiais.id, e.filialId)).limit(1),
  ]);
  const filial = filialRows[0];

  const respostas = (e.respostasRoteiro ?? {}) as Record<string, string | number | boolean>;
  const notas = (e.notasCriterios ?? {}) as Record<string, number>;
  const notasArr = Object.values(notas).map(Number).filter((n) => !Number.isNaN(n) && n > 0);
  const media = notasArr.length > 0 ? (notasArr.reduce((a, b) => a + b, 0) / notasArr.length).toFixed(2) : '—';

  // CRITÉRIOS - tabela com cabeçalho
  const critRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          borders: allBorders,
          width: { size: 5400, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: PERLOG_NAVY },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: 'Critério', bold: true, color: 'FFFFFF', size: 20 })] })],
        }),
        new TableCell({
          borders: allBorders,
          width: { size: 1800, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: PERLOG_NAVY },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nota', bold: true, color: 'FFFFFF', size: 20 })] })],
        }),
        new TableCell({
          borders: allBorders,
          width: { size: 1800, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: PERLOG_NAVY },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Escala', bold: true, color: 'FFFFFF', size: 20 })] })],
        }),
      ],
    }),
    ...criterios.map((c) =>
      new TableRow({
        children: [
          new TableCell({
            borders: allBorders,
            width: { size: 5400, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: c.nome, size: 20 })] })],
          }),
          new TableCell({
            borders: allBorders,
            width: { size: 1800, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: notas[c.id]?.toString() ?? '—', bold: true, size: 20 })] })],
          }),
          new TableCell({
            borders: allBorders,
            width: { size: 1800, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `0–${c.escalaMax}`, color: '64748B', size: 20 })] })],
          }),
        ],
      })
    ),
    new TableRow({
      children: [
        new TableCell({
          borders: allBorders,
          width: { size: 5400, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: 'FEF3E8' },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: 'Média geral', bold: true, size: 20 })] })],
        }),
        new TableCell({
          borders: allBorders,
          width: { size: 3600, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: 'FEF3E8' },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          columnSpan: 2,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: media, bold: true, size: 20 })] })],
        }),
      ],
    }),
  ];

  const roteiroBlocks: Paragraph[] = [];
  if (roteiro.length === 0) {
    roteiroBlocks.push(new Paragraph({ children: [new TextRun({ text: 'Sem perguntas configuradas.', italics: true, size: 20, color: '64748B' })] }));
  } else {
    roteiro.forEach((q, i) => {
      const resp = respostas[q.id];
      const respText = (resp === undefined || resp === null || resp === '') ? 'Sem resposta' : String(resp);
      roteiroBlocks.push(
        new Paragraph({
          spacing: { before: 160, after: 60 },
          children: [
            new TextRun({ text: `${String(i + 1).padStart(2, '0')}. `, bold: true, color: PERLOG_ORANGE, size: 20 }),
            new TextRun({ text: q.pergunta, bold: true, size: 20 }),
          ],
        }),
        new Paragraph({
          shading: { type: ShadingType.CLEAR, fill: LIGHT_GRAY },
          spacing: { after: 80 },
          children: [new TextRun({ text: respText, size: 20, italics: respText === 'Sem resposta' })],
        }),
      );
    });
  }

  const doc = new Document({
    creator: 'Sistema RH G&G — Grupo Perlog',
    title: `Ficha de Entrevista — ${e.nome}`,
    description: `Entrevista de ${e.nome} (CPF ${e.cpf}) em ${fmtDateTime(e.dataHora)}`,
    styles: {
      default: { document: { run: { font: 'Calibri', size: 20 } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: PERLOG_ORANGE, space: 4 } },
                children: [
                  new TextRun({ text: 'GRUPO PERLOG', bold: true, color: PERLOG_NAVY, size: 22 }),
                  new TextRun({ text: '  ·  Gente & Gestão  ·  Ficha de Entrevista', color: '64748B', size: 18 }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                border: { top: { style: BorderStyle.SINGLE, size: 6, color: BORDER_GRAY, space: 4 } },
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `Filial ${filial?.codigo ?? '—'} ${filial?.nome ?? ''}  ·  Ficha #${e.id.slice(0, 8).toUpperCase()}  ·  Página `, size: 16, color: '64748B' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '64748B' }),
                  new TextRun({ text: ' de ', size: 16, color: '64748B' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '64748B' }),
                  new TextRun({ text: '  ·  Desenvolvido por Juliano Patrick', size: 16, color: '64748B', italics: true }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: 'FICHA DE ENTREVISTA', bold: true, color: PERLOG_NAVY, size: 36 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [new TextRun({ text: `Documento gerado em ${fmtDateTime(new Date())}`, color: '64748B', size: 18, italics: true })],
          }),

          sectionTitle('1', 'Identificação do candidato'),
          kvTable([
            ['Nome', e.nome],
            ['CPF', fmtCpf(e.cpf)],
            ['Data de nascimento', fmtDate(e.dataNasc)],
            ['Telefone', e.telefone ?? '—'],
            ['E-mail', e.email ?? '—'],
            ['Cidade', e.cidade ?? '—'],
          ]),

          sectionTitle('2', 'Dados da entrevista'),
          kvTable([
            ['Data da entrevista', fmtDateTime(e.dataHora)],
            ['Entrevistador(a)', e.recrutador ?? '—'],
            ['Unidade / CD', filial ? `${filial.codigo} — ${filial.nome}` : '—'],
            ['Cargo proposto', e.cargoPretendido ?? '—'],
            ['Pretensão salarial', e.pretensaoSalarial ? `R$ ${Number(e.pretensaoSalarial).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'],
            ['Escolaridade', e.escolaridade ?? '—'],
            ['Estado civil', e.estadoCivil ?? '—'],
            ['CNH', e.possuiCnh ?? '—'],
            ['Preferência de turno', (e.disponibilidadeTurnos ?? []).join(' · ') || '—'],
          ]),

          ...(e.experiencias ? [
            sectionTitle('3', 'Experiências profissionais'),
            new Paragraph({
              shading: { type: ShadingType.CLEAR, fill: LIGHT_GRAY },
              children: [new TextRun({ text: e.experiencias, size: 20 })],
            }),
          ] : []),

          sectionTitle('4', 'Roteiro da entrevista'),
          ...roteiroBlocks,

          sectionTitle('5', 'Avaliação por critério'),
          new Table({
            width: { size: 9000, type: WidthType.DXA },
            columnWidths: [5400, 1800, 1800],
            rows: critRows,
          }),

          sectionTitle('6', 'Parecer final'),
          kvTable([
            ['Status', e.status],
            ['Avaliado pelo G&G', e.aprovadoPeloGg ? 'Sim' : 'Não'],
            ...(e.status === 'Aprovado' || e.status === 'Reprovado'
              ? ([
                  ['Gestor que decidiu', e.gestorAprovador ?? '—'],
                  ['Data da decisão', fmtDateTime(e.decisaoEm)],
                ] as Array<[string, string]>)
              : []),
            ['Data de retorno', fmtDate(e.dataRetorno)],
            ['Motivo da decisão', e.motivoDecisao ?? '—'],
            ['Observações', e.observacoes ?? '—'],
          ]),

          new Paragraph({ spacing: { before: 600 }, children: [new TextRun({ text: ' ' })] }),
          new Table({
            width: { size: 9000, type: WidthType.DXA },
            columnWidths: [4500, 4500],
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 4500, type: WidthType.DXA },
                    borders: { top: { style: BorderStyle.SINGLE, size: 8, color: PERLOG_NAVY }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: e.recrutador ?? 'Entrevistador(a)', size: 18, color: '64748B' })] })],
                  }),
                  new TableCell({
                    width: { size: 4500, type: WidthType.DXA },
                    borders: { top: { style: BorderStyle.SINGLE, size: 8, color: PERLOG_NAVY }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${e.nome} (candidato)`, size: 18, color: '64748B' })] })],
                  }),
                ],
              }),
            ],
          }),

          ...(e.consentimentoLgpdEm ? [
            new Paragraph({
              spacing: { before: 240 },
              children: [
                new TextRun({
                  text: `Consentimento LGPD registrado em ${fmtDateTime(e.consentimentoLgpdEm)}. Dados tratados conforme Lei 13.709/2018.`,
                  size: 16, italics: true, color: '64748B',
                }),
              ],
            }),
          ] : []),
        ],
      },
    ],
  });

  // Silence unused import lint
  void ImageRun;

  const buffer = await Packer.toBuffer(doc);
  const safeName = e.nome.replace(/[^a-zA-Z0-9\s_-]/g, '').replace(/\s+/g, '_').slice(0, 50);
  const filename = `Entrevista_${safeName}_${e.id.slice(0, 8)}.docx`;
  // Use Uint8Array slice so Response treats it as a BodyInit (Node Buffer is also accepted, but ArrayBuffer is portable)
  const body = new Uint8Array(buffer);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
