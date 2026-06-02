// src/Auth.gs

const Auth = (() => {
  const TTL_MS = 8 * 60 * 60 * 1000;

  function _saveSession(token, payload) {
    PropertiesService.getScriptProperties().setProperty('sess:' + token, JSON.stringify(
      Object.assign({}, payload, { expira: Date.now() + TTL_MS })
    ));
  }
  function _readSession(token) {
    const raw = PropertiesService.getScriptProperties().getProperty('sess:' + token);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj.expira < Date.now()) {
      PropertiesService.getScriptProperties().deleteProperty('sess:' + token);
      return null;
    }
    return obj;
  }

  return {
    login({ senha, usuario }) {
      if (!senha) return { ok: false, erro: 'Senha obrigatória' };
      const hash = sha256(senha);

      // tenta admin (usuario + senha)
      if (usuario) {
        const admin = Repo.admin();
        if (admin && admin.usuario === usuario && admin.senha_hash === hash) {
          const token = uuid() + uuid();
          _saveSession(token, { perfil: 'admin', usuario });
          Repo.appendAcesso({ data_hora: nowISO(), usuario: 'admin:' + usuario, acao: 'login', detalhe: '' });
          return { ok: true, token, perfil: 'admin', nome: 'Administrador' };
        }
        return { ok: false, erro: 'Usuário ou senha inválidos' };
      }

      // tenta filial (só senha)
      const filial = Repo.filialPorHash(hash);
      if (filial) {
        const token = uuid() + uuid();
        _saveSession(token, { perfil: 'filial', filial: filial.codigo });
        Repo.appendAcesso({ data_hora: nowISO(), usuario: 'filial:' + filial.codigo, acao: 'login', detalhe: '' });
        return { ok: true, token, perfil: 'filial', filial: filial.codigo, nome: filial.nome };
      }
      return { ok: false, erro: 'Senha inválida' };
    },
    logout(token) {
      PropertiesService.getScriptProperties().deleteProperty('sess:' + token);
      return { ok: true };
    },
    validar(token) {
      return _readSession(token);
    },
    exigir(token, perfilEsperado) {
      const s = _readSession(token);
      if (!s) throw new Error('Sessão expirada — faça login novamente.');
      if (perfilEsperado && s.perfil !== perfilEsperado) throw new Error('Acesso negado.');
      return s;
    },
    trocarSenhaFilial(token, codigo, novaSenha) {
      this.exigir(token, 'admin');
      Repo.setFilialSenhaHash(codigo, sha256(novaSenha));
      return { ok: true };
    },
  };
})();

// Endpoints públicos (chamados pelo frontend)
function authLogin(payload) { return Auth.login(payload); }
function authLogout(token) { return Auth.logout(token); }
function authMe(token) { return Auth.validar(token); }
