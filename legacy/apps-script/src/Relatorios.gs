// src/Relatorios.gs

function listarTodas(token, filtros) {
  Auth.exigir(token, 'admin');
  const all = Repo.listTodas();
  const f = filtros || {};
  return all.filter(r => {
    if (f.cpf      && String(r.cpf).replace(/\D/g,'').indexOf(String(f.cpf).replace(/\D/g,'')) < 0) return false;
    if (f.nome     && !(r.nome || '').toLowerCase().includes(f.nome.toLowerCase())) return false;
    if (f.cargo    && !(r.cargo_pretendido || '').toLowerCase().includes(f.cargo.toLowerCase())) return false;
    if (f.filial   && String(r.filial) !== String(f.filial)) return false;
    if (f.status   && r.status !== f.status) return false;
    if (f.dataDe   && (r.data_hora || '') < f.dataDe) return false;
    if (f.dataAte  && (r.data_hora || '') > f.dataAte + 'T23:59:59') return false;
    return true;
  });
}

function dashboard(token) {
  Auth.exigir(token, 'admin');
  const all = Repo.listTodas();
  const porFilial = {}, porStatus = {}, porMes = {}, porCargo = {};
  let somaNotas = 0, totalNotas = 0;
  all.forEach(r => {
    porFilial[r.filial] = (porFilial[r.filial] || 0) + 1;
    porStatus[r.status] = (porStatus[r.status] || 0) + 1;
    const mes = (r.data_hora || '').slice(0, 7);
    if (mes) porMes[mes] = (porMes[mes] || 0) + 1;
    porCargo[r.cargo_pretendido] = (porCargo[r.cargo_pretendido] || 0) + 1;
    if (typeof r.nota_geral === 'number') { somaNotas += r.nota_geral; totalNotas++; }
  });
  return {
    total: all.length,
    porFilial, porStatus, porMes, porCargo,
    mediaNotaGeral: totalNotas ? Math.round((somaNotas/totalNotas)*100)/100 : 0,
    bancoTalentos: all.filter(r => r.status === 'Banco de Talentos').length,
    aprovados: all.filter(r => r.status === 'Aprovado').length,
    contratados: all.filter(r => r.status === 'Contratado').length,
  };
}
