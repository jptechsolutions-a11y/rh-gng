// src/Log.gs — wrapper para logs (toda gravação real está no Repo)

function logAcesso(usuario, acao, detalhe) {
  Repo.appendAcesso({
    data_hora: nowISO(),
    usuario: usuario || '',
    acao: acao || '',
    detalhe: detalhe || '',
  });
}
