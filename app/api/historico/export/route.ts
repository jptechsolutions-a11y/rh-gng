import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireSession } from '@/lib/auth/session';
import { listarEntrevistasFilial } from '@/actions/entrevistas';

export const dynamic = 'force-dynamic';

function retornoDe(status: string) {
  if (status === 'Aprovado') return 'Aprovado';
  if (status === 'Reprovado') return 'Reprovado';
  return 'Pendente';
}
function fmt(d: Date | string | null | undefined) {
  if (!d) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(d));
}
function fmtCpf(c: string) {
  return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export async function GET(req: NextRequest) {
  const s = await requireSession('filial');
  const sp = req.nextUrl.searchParams;

  const q = (sp.get('q') ?? '').trim().toLowerCase();
  const qDigits = q.replace(/\D/g, '');
  const status = sp.get('status');
  const retorno = sp.get('retorno');
  const cargo = sp.get('cargo');
  const periodoDias = sp.get('periodo') ? Number(sp.get('periodo')) : 0;
  const periodoCutoff = periodoDias > 0 ? Date.now() - periodoDias * 86400000 : 0;

  const all = await listarEntrevistasFilial();
  const rows = all.filter((e) => {
    if (status && status !== 'Todos' && e.status !== status) return false;
    const ret = retornoDe(e.status);
    if (retorno && retorno !== 'Todos' && ret !== retorno) return false;
    if (cargo && (e.cargoPretendido ?? '') !== cargo) return false;
    if (periodoCutoff && e.dataHora.getTime() < periodoCutoff) return false;
    if (q) {
      const hitNome = e.nome.toLowerCase().includes(q);
      const hitCpf = qDigits.length >= 3 && e.cpf.includes(qDigits);
      const hitEmail = (e.email ?? '').toLowerCase().includes(q);
      if (!hitNome && !hitCpf && !hitEmail) return false;
    }
    return true;
  });

  const data = rows.map((e) => ({
    'Nome': e.nome,
    'CPF': fmtCpf(e.cpf),
    'Cargo proposto': e.cargoPretendido ?? '',
    'Telefone': e.telefone ?? '',
    'E-mail': e.email ?? '',
    'Cidade': e.cidade ?? '',
    'Escolaridade': e.escolaridade ?? '',
    'CNH': e.possuiCnh ?? '',
    'Pretensão salarial': e.pretensaoSalarial ? Number(e.pretensaoSalarial) : '',
    'Turnos': (e.disponibilidadeTurnos ?? []).join(' · '),
    'Entrevistador': e.recrutador ?? '',
    'Status': e.status,
    'Retorno': retornoDe(e.status),
    'Aprovado pelo G&G': e.aprovadoPeloGg ? 'Sim' : 'Não',
    'Gestor aprovador': e.gestorAprovador ?? '',
    'Data entrevista': fmt(e.dataHora),
    'Data decisão': fmt(e.decisaoEm),
    'Data retorno': e.dataRetorno ? new Date(e.dataRetorno).toLocaleDateString('pt-BR') : '',
    'Motivo': e.motivoDecisao ?? '',
    'Observações': e.observacoes ?? '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  // Larguras estimadas
  ws['!cols'] = [
    { wch: 28 }, { wch: 16 }, { wch: 24 }, { wch: 16 }, { wch: 28 }, { wch: 18 },
    { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 20 },
    { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 22 },
    { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 40 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Entrevistas');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `Historico_${s.filialCodigo}_${stamp}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
