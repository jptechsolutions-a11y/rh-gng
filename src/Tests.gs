// src/Tests.gs — runAllTests()

function _assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
}
function _assertEq(a, b, msg) {
  if (a !== b) throw new Error('FAIL: ' + msg + ' — esperado "' + b + '", obtido "' + a + '"');
}

function runAllTests() {
  const tests = [
    test_uuid_formato,
    test_hash_deterministico,
    test_validaCPF_valido,
    test_validaCPF_invalido,
    test_validaCPF_repetidos,
    test_Repo_readConfigOpcoes,
    test_Repo_readCargos,
    test_Repo_filialPorCodigo,
    test_Auth_loginFilial_senhaErrada,
    test_Auth_validarToken_invalido,
  ];
  let pass = 0, fail = 0;
  tests.forEach(t => {
    try { t(); Logger.log('✓ ' + t.name); pass++; }
    catch (e) { Logger.log('✗ ' + t.name + ' — ' + e.message); fail++; }
  });
  Logger.log('Total: ' + pass + ' passou, ' + fail + ' falhou.');
  return { pass, fail };
}

function test_uuid_formato() {
  const id = uuid();
  _assert(/^[A-Z0-9-]+$/i.test(id), 'uuid deve conter alfanuméricos e hífens');
  _assert(id.length >= 8, 'uuid deve ter no mínimo 8 caracteres');
}

function test_hash_deterministico() {
  _assertEq(sha256('abc'), sha256('abc'), 'hash igual para mesma entrada');
  _assert(sha256('abc') !== sha256('abd'), 'hash diferente para entradas diferentes');
}

function test_validaCPF_valido() {
  _assert(validaCPF('529.982.247-25'), '52998224725 é válido');
  _assert(validaCPF('11144477735'), '11144477735 é válido');
}

function test_validaCPF_invalido() {
  _assert(!validaCPF('12345678900'), '12345678900 é inválido');
  _assert(!validaCPF('abc'), 'string não numérica é inválida');
  _assert(!validaCPF(''), 'vazio é inválido');
}

function test_validaCPF_repetidos() {
  _assert(!validaCPF('11111111111'), 'CPFs com todos dígitos iguais são inválidos');
}

function test_Repo_readConfigOpcoes() {
  const op = Repo.readConfigOpcoes();
  _assert(Array.isArray(op.escolaridade), 'opções de escolaridade devem ser array');
  _assert(op.escolaridade.length > 0, 'escolaridade não vazia');
}

function test_Repo_readCargos() {
  const cargos = Repo.readCargos();
  _assert(Array.isArray(cargos), 'cargos é array');
  _assert(cargos.length > 0, 'cargos não vazio');
}

function test_Repo_filialPorCodigo() {
  const f = Repo.filialPorCodigo('464');
  _assertEq(f.nome, 'MT TREVO', 'filial 464 deve ser MT TREVO');
}

function test_Auth_loginFilial_senhaErrada() {
  const r = Auth.login({ senha: 'senha-errada-xyz' });
  _assert(!r.ok, 'login com senha errada deve falhar');
}

function test_Auth_validarToken_invalido() {
  _assert(!Auth.validar('token-inexistente'), 'token inválido retorna false');
}
