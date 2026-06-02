// src/Drive.gs

function uploadPDF(token, payload) {
  const sess = Auth.exigir(token);
  if (!payload.base64 || !payload.nomeArquivo) return { ok: false, erro: 'Dados ausentes' };

  const filialCodigo = sess.filial || payload.filial || 'ADMIN';
  const pasta = _garantirPastaFilial(filialCodigo);
  const blob = Utilities.newBlob(
    Utilities.base64Decode(payload.base64),
    'application/pdf',
    payload.nomeArquivo
  );
  const file = pasta.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { ok: true, url: file.getUrl() };
}

function _garantirPastaFilial(codigo) {
  const root = _pasta('RH-G&G');
  const cur = _pasta('Curriculos', root);
  return _pasta(codigo, cur);
}

function _pasta(nome, parent) {
  const base = parent || DriveApp.getRootFolder();
  const it = base.getFoldersByName(nome);
  return it.hasNext() ? it.next() : base.createFolder(nome);
}
