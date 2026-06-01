// src/Config.gs

function bootstrap(token) {
  const sess = Auth.exigir(token);
  return {
    perfil: sess.perfil,
    filial: sess.filial || null,
    cargos: Repo.readCargos(),
    opcoes: Repo.readConfigOpcoes(),
    criterios: Repo.readCriterios(),
    filiais: sess.perfil === 'admin' ? Repo.filiais() : [],
  };
}

function getRoteiro(token, cargo) {
  Auth.exigir(token);
  return Repo.readRoteiro(cargo || 'TODOS');
}

function salvarCargo(token, payload) {
  Auth.exigir(token, 'admin');
  Repo.upsertCargo(payload.nome_cargo, payload.ativo || 'sim');
  return { ok: true };
}

function salvarRoteiroItem(token, item) {
  Auth.exigir(token, 'admin');
  Repo.upsertRoteiro(item);
  return { ok: true };
}

function excluirRoteiroItem(token, id) {
  Auth.exigir(token, 'admin');
  Repo.deleteRoteiro(id);
  return { ok: true };
}

function salvarCriterio(token, item) {
  Auth.exigir(token, 'admin');
  Repo.upsertCriterio(item);
  return { ok: true };
}

function trocarSenhaFilial(token, codigo, novaSenha) {
  return Auth.trocarSenhaFilial(token, codigo, novaSenha);
}
