import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireSession } from '@/lib/auth/session';
import { carregarAta, dataBrDeIso } from '@/lib/comite/ata';
import { fmtTempo, mesValido, nomeMes, rotuloDecisao } from '@/lib/comite/tipos';

export const dynamic = 'force-dynamic';

const dataHora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '';

/** Ata em Excel: um colaborador por linha, com todas as informações do pedido. */
export async function GET(req: NextRequest) {
  const s = await requireSession();
  if (s.perfil !== 'admin') return NextResponse.json({ erro: 'apenas o administrador exporta a ata' }, { status: 403 });
  const mes = req.nextUrl.searchParams.get('mes');
  if (!mes || !mesValido(mes)) return NextResponse.json({ erro: 'mês inválido' }, { status: 400 });

  const d = await carregarAta(s, mes);

  const linhas = d.lancamentos.map((l) => ({
    'Mês de referência': nomeMes(d.mes),
    'Data do comitê': dataBrDeIso(d.dataComite),
    'Filial': l.filial,
    'Matrícula': l.chapa,
    'Nome': l.nome,
    'Função': l.funcao,
    'Seção': l.secao,
    'Turno': l.turno,
    'Horário': l.horario ?? '',
    'Admissão': dataBrDeIso(l.admissao),
    'Tempo de empresa': fmtTempo(l.tempoMeses),
    'Idade': l.idade ?? '',
    'Suspensões': l.suspensoes,
    'Advertências': l.advertencias,
    'Justificativa do pedido': l.justificativa,
    'Lançado por': l.criadoPor,
    'Lançado em': dataHora(l.criadoEm),
    'Decisão': rotuloDecisao(l.decisao),
    'Motivo da não aprovação': l.decisao === 'nao_aprovado' ? (l.decisaoMotivo ?? '') : '',
  }));

  const ws = XLSX.utils.json_to_sheet(linhas);
  ws['!cols'] = [
    { wch: 18 }, { wch: 14 }, { wch: 8 }, { wch: 12 }, { wch: 32 }, { wch: 28 }, { wch: 28 }, { wch: 10 }, { wch: 34 },
    { wch: 12 }, { wch: 18 }, { wch: 7 }, { wch: 11 }, { wch: 12 }, { wch: 50 }, { wch: 18 }, { wch: 17 }, { wch: 14 },
    { wch: 40 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pedidos');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Ata_Comite_Desligamento_${mes}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
