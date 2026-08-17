import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { listarInformacoesPassageiros } from '@/actions/transporte-cadastro';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const filialIdParam = sp.get('filialId') ?? undefined;
  const busca = (sp.get('busca') ?? '').trim();
  const rota = sp.get('rota') ?? '';
  const status = sp.get('status') ?? '';

  // listarInformacoesPassageiros já valida sessão/acesso ao módulo e resolve
  // filialId (admin precisa do param; perfil filial usa o da própria sessão).
  const dados = await listarInformacoesPassageiros(filialIdParam);

  // Mesma lógica de filtro do client (InformacoesPassageiros.tsx `filtrados`),
  // para que o Excel reflita exatamente o que está sendo mostrado na tela.
  let rows = dados;
  if (busca) {
    const q = busca.toLowerCase();
    const qDigits = busca.replace(/\D/g, '');
    rows = rows.filter((d) =>
      d.nome.toLowerCase().includes(q) ||
      (d.chapa ?? '').toLowerCase().includes(q) ||
      (d.endereco ?? '').toLowerCase().includes(q) ||
      (qDigits !== '' && (d.cpf ?? '').replace(/\D/g, '').includes(qDigits))
    );
  }
  if (rota === '__sem_rota__') rows = rows.filter((d) => !d.rotaNome);
  else if (rota) rows = rows.filter((d) => d.rotaNome === rota);
  if (status) rows = rows.filter((d) => d.situacao === status);

  const data = rows.map((d) => ({
    'Nome': d.nome,
    'CPF': d.cpf ?? '',
    'Rota': d.rotaNome ?? '',
    'Turno': d.rotaTurno ?? '',
    'Veículo': d.veiculo ?? '',
    'Endereço': d.endereco ?? '',
    'Telefone 1': d.telefone1 ?? '',
    'Telefone 2': d.telefone2 ?? '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 28 }, { wch: 16 }, { wch: 22 }, { wch: 12 },
    { wch: 18 }, { wch: 36 }, { wch: 16 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Informações');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const stamp = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })
    .format(new Date())
    .replace(/\//g, '-');
  const filename = `Informações Fretado ${stamp}.xlsx`;
  const filenameAscii = `Informacoes Fretado ${stamp}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        `attachment; filename="${filenameAscii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  });
}
