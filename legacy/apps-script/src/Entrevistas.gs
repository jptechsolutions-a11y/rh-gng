// src/Entrevistas.gs

function salvarEntrevista(token, payload) {
  const sess = Auth.exigir(token, 'filial');
  if (!validaCPF(payload.cpf)) return { ok: false, erro: 'CPF inválido' };
  if (!payload.nome)            return { ok: false, erro: 'Nome obrigatório' };
  if (!payload.cargo_pretendido) return { ok: false, erro: 'Cargo obrigatório' };
  if (!payload.status)          return { ok: false, erro: 'Status obrigatório' };
  if (payload.status === 'Reprovado' && !payload.motivo_decisao) {
    return { ok: false, erro: 'Motivo obrigatório para reprovação' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const id = gerarIdEntrevista();
    const agora = nowISO();
    const media = _calcularMedia(payload.notas_criterios);

    const row = {
      id_entrevista: id,
      data_hora: agora,
      filial: sess.filial,
      cpf: String(payload.cpf).replace(/\D/g, ''),
      nome: payload.nome,
      data_nasc: payload.data_nasc || '',
      rg: payload.rg || '',
      telefone: payload.telefone || '',
      email: payload.email || '',
      cidade: payload.cidade || '',
      cargo_pretendido: payload.cargo_pretendido,
      pretensao_salarial: payload.pretensao_salarial || '',
      experiencias: payload.experiencias || '',
      linkedin: payload.linkedin || '',
      escolaridade: payload.escolaridade || '',
      estado_civil: payload.estado_civil || '',
      tem_filhos: payload.tem_filhos || '',
      possui_cnh: payload.possui_cnh || '',
      veiculo_proprio: payload.veiculo_proprio || '',
      disponibilidade_turnos: (payload.disponibilidade_turnos || []).join('|'),
      disponibilidade_inicio: payload.disponibilidade_inicio || '',
      disponibilidade_viagem: payload.disponibilidade_viagem || '',
      pcd: payload.pcd || '',
      pcd_tipo: payload.pcd_tipo || '',
      pcd_laudo_url: payload.pcd_laudo_url || '',
      indicacao: payload.indicacao || '',
      indicado_por_nome: payload.indicado_por_nome || '',
      indicado_por_cargo: payload.indicado_por_cargo || '',
      fumante: payload.fumante || '',
      ja_trabalhou_grupo: payload.ja_trabalhou_grupo || '',
      ja_trabalhou_quando: payload.ja_trabalhou_quando || '',
      curriculo_url: payload.curriculo_url || '',
      respostas_roteiro: JSON.stringify(payload.respostas_roteiro || {}),
      notas_criterios: JSON.stringify(payload.notas_criterios || {}),
      media_notas: media,
      observacoes: payload.observacoes || '',
      nota_geral: payload.nota_geral || '',
      status: payload.status,
      motivo_decisao: payload.motivo_decisao || '',
      proxima_etapa: payload.proxima_etapa || '',
      data_retorno: payload.data_retorno || '',
      recrutador: 'filial:' + sess.filial,
      atualizado_em: agora,
      atualizado_por: 'filial:' + sess.filial,
    };

    Repo.appendEntrevista(sess.filial, row);
    Repo.appendHistorico({
      id_entrevista: id, data_hora: agora,
      de_status: '', para_status: payload.status,
      usuario: 'filial:' + sess.filial,
      motivo: payload.motivo_decisao || '',
    });

    CacheService.getScriptCache().remove('cpf:' + row.cpf);
    return { ok: true, id };
  } finally {
    lock.releaseLock();
  }
}

function atualizarStatus(token, payload) {
  const sess = Auth.exigir(token);
  if (!payload.id || !payload.para_status) return { ok: false, erro: 'Dados incompletos' };
  if (payload.para_status === 'Reprovado' && !payload.motivo) {
    return { ok: false, erro: 'Motivo obrigatório' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const filialCodigo = sess.perfil === 'admin' ? payload.filial : sess.filial;
    if (!filialCodigo) return { ok: false, erro: 'Filial não informada' };

    const linhas = Repo.listFilial(filialCodigo).filter(r => r.id_entrevista === payload.id);
    if (!linhas.length) return { ok: false, erro: 'Entrevista não encontrada' };
    const atual = linhas[0];

    const usuario = sess.perfil === 'admin' ? 'admin:' + sess.usuario : 'filial:' + sess.filial;
    Repo.updateEntrevista(filialCodigo, payload.id, {
      status: payload.para_status,
      motivo_decisao: payload.motivo || atual.motivo_decisao,
      proxima_etapa: payload.proxima_etapa || atual.proxima_etapa,
      data_retorno: payload.data_retorno || atual.data_retorno,
      atualizado_em: nowISO(),
      atualizado_por: usuario,
    });
    Repo.appendHistorico({
      id_entrevista: payload.id, data_hora: nowISO(),
      de_status: atual.status, para_status: payload.para_status,
      usuario, motivo: payload.motivo || '',
    });
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function _calcularMedia(notas) {
  if (!notas) return '';
  const vals = Object.values(notas).filter(v => typeof v === 'number');
  if (!vals.length) return '';
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}
