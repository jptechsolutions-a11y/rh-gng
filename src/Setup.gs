// src/Setup.gs — bootstrap das abas

const FILIAIS = [
  { codigo: '464', nome: 'MT TREVO' },
  { codigo: '468', nome: 'MT PONTE NOVA' },
  { codigo: '743', nome: 'MS GUAICURUS' },
  { codigo: '783', nome: 'SC SAO JOSE' },
  { codigo: '264', nome: 'SC PORTO BELO' },
  { codigo: '773', nome: 'RS SAO LEOPOLDO' },
  { codigo: '713', nome: 'SP VARGEM GRANDE' },
  { codigo: '733', nome: 'SP JACAREI' },
  { codigo: '364', nome: 'DF SIA' },
];

const COLUNAS_FILIAL = [
  'id_entrevista','data_hora','filial','cpf','nome','data_nasc','rg','telefone','email','cidade',
  'cargo_pretendido','pretensao_salarial','experiencias','linkedin','escolaridade','estado_civil',
  'tem_filhos','possui_cnh','veiculo_proprio','disponibilidade_turnos','disponibilidade_inicio',
  'disponibilidade_viagem','pcd','pcd_tipo','pcd_laudo_url','indicacao','indicado_por_nome',
  'indicado_por_cargo','fumante','ja_trabalhou_grupo','ja_trabalhou_quando','curriculo_url',
  'respostas_roteiro','notas_criterios','media_notas','observacoes','nota_geral','status',
  'motivo_decisao','proxima_etapa','data_retorno','recrutador','atualizado_em','atualizado_por'
];

function nomeAbaFilial(f) {
  return f.codigo + '-' + f.nome.replace(/\s+/g, '-');
}

function setupPlanilha() {
  const ss = SpreadsheetApp.getActive();
  const senhasGeradas = [];

  // 1. Abas de filial
  FILIAIS.forEach(f => {
    const nome = nomeAbaFilial(f);
    let aba = ss.getSheetByName(nome);
    if (!aba) aba = ss.insertSheet(nome);
    aba.getRange(1, 1, 1, COLUNAS_FILIAL.length).setValues([COLUNAS_FILIAL]).setFontWeight('bold');
    aba.setFrozenRows(1);
  });

  // 2. _CONFIG_FILIAIS (gera senhas)
  _criarAba(ss, '_CONFIG_FILIAIS', ['codigo','nome','senha_hash','ativa']);
  const filiaisRows = FILIAIS.map(f => {
    const senhaPlain = f.codigo + '@' + Math.random().toString(36).slice(2, 8);
    senhasGeradas.push({ filial: f.codigo + ' - ' + f.nome, senha: senhaPlain });
    return [f.codigo, f.nome, sha256(senhaPlain), 'sim'];
  });
  ss.getSheetByName('_CONFIG_FILIAIS').getRange(2, 1, filiaisRows.length, 4).setValues(filiaisRows);

  // 3. _CONFIG_ADMIN com senha padrão
  _criarAba(ss, '_CONFIG_ADMIN', ['usuario','senha_hash']);
  const adminSenha = 'admin@' + Math.random().toString(36).slice(2, 8);
  ss.getSheetByName('_CONFIG_ADMIN').getRange(2, 1, 1, 2).setValues([['admin', sha256(adminSenha)]]);
  senhasGeradas.push({ filial: 'ADMIN (usuário: admin)', senha: adminSenha });

  // 4. _CONFIG_CARGOS
  _criarAba(ss, '_CONFIG_CARGOS', ['nome_cargo','ativo']);
  const cargosDefault = ['Vendedor','Motorista','Operador','Auxiliar Administrativo','Estoquista'];
  ss.getSheetByName('_CONFIG_CARGOS').getRange(2, 1, cargosDefault.length, 2)
    .setValues(cargosDefault.map(c => [c, 'sim']));

  // 5. _CONFIG_ROTEIRO
  _criarAba(ss, '_CONFIG_ROTEIRO', ['id','cargo','ordem','pergunta','tipo']);
  const roteiroDefault = [
    ['q1','TODOS',1,'Conte um pouco sobre você.','texto'],
    ['q2','TODOS',2,'Por que se interessa por essa vaga?','texto'],
    ['q3','TODOS',3,'Tem disponibilidade para começar imediatamente?','sim-nao'],
    ['q4','TODOS',4,'Como avalia seu nível de comunicação?','escala'],
  ];
  ss.getSheetByName('_CONFIG_ROTEIRO').getRange(2, 1, roteiroDefault.length, 5).setValues(roteiroDefault);

  // 6. _CONFIG_CRITERIOS
  _criarAba(ss, '_CONFIG_CRITERIOS', ['id','nome_criterio','escala_max','peso','ativo']);
  const criteriosDefault = [
    ['c1','Comunicação',5,1,'sim'],
    ['c2','Experiência',5,1,'sim'],
    ['c3','Apresentação',5,1,'sim'],
    ['c4','Disponibilidade',5,1,'sim'],
    ['c5','Fit cultural',5,1,'sim'],
  ];
  ss.getSheetByName('_CONFIG_CRITERIOS').getRange(2, 1, criteriosDefault.length, 5).setValues(criteriosDefault);

  // 7. _CONFIG_OPCOES
  _criarAba(ss, '_CONFIG_OPCOES', ['chave','valor']);
  const opcoes = [
    ['escolaridade','Fundamental|Médio|Técnico|Superior incompleto|Superior|Pós'],
    ['estado_civil','Solteiro|Casado|União estável|Divorciado|Viúvo'],
    ['turnos','Manhã|Tarde|Noite|Madrugada|Comercial|12x36|6x1'],
    ['cnh','Não|A|B|AB|C|D|E'],
    ['status','Aprovado|Reprovado|Banco de Talentos|Contratado|Em análise'],
  ];
  ss.getSheetByName('_CONFIG_OPCOES').getRange(2, 1, opcoes.length, 2).setValues(opcoes);

  // 8. _LOG_HISTORICO e _LOG_ACESSOS
  _criarAba(ss, '_LOG_HISTORICO', ['id_entrevista','data_hora','de_status','para_status','usuario','motivo']);
  _criarAba(ss, '_LOG_ACESSOS', ['data_hora','usuario','acao','detalhe']);

  // 9. Pasta no Drive
  const folderName = 'RH-G&G';
  const folders = DriveApp.getFoldersByName(folderName);
  const root = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  const subName = 'Curriculos';
  const subs = root.getFoldersByName(subName);
  if (!subs.hasNext()) root.createFolder(subName);

  // 10. Mostra senhas no log
  Logger.log('===== SENHAS GERADAS (anote em local seguro!) =====');
  senhasGeradas.forEach(s => Logger.log(s.filial + ' → ' + s.senha));
  Logger.log('====================================================');
  return senhasGeradas;
}

function _criarAba(ss, nome, cabecalho) {
  let aba = ss.getSheetByName(nome);
  if (!aba) aba = ss.insertSheet(nome);
  else aba.clear();
  aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]).setFontWeight('bold');
  aba.setFrozenRows(1);
}
