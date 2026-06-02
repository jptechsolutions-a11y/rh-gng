// src/Candidatos.gs

function buscarPorCPF(token, cpf) {
  Auth.exigir(token);
  if (!validaCPF(cpf)) return { ok: false, erro: 'CPF inválido' };
  const cache = CacheService.getScriptCache();
  const key = 'cpf:' + cpf.replace(/\D/g, '');
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);

  const rows = Repo.findByCPFEmTodasFiliais(cpf);
  const dadosUltimo = rows.length ? rows[rows.length - 1] : null;
  const resp = {
    ok: true,
    encontrado: rows.length > 0,
    historico: rows.map(r => ({
      id: r.id_entrevista, data: r.data_hora, filial: r.filial,
      cargo: r.cargo_pretendido, status: r.status, nota: r.nota_geral
    })),
    dados: dadosUltimo,
  };
  cache.put(key, JSON.stringify(resp), 300);
  return resp;
}

function listarFilial(token) {
  const sess = Auth.exigir(token, 'filial');
  return Repo.listFilial(sess.filial);
}
