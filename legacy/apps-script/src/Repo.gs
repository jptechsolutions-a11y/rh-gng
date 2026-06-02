// src/Repo.gs — camada única de acesso ao Sheets

const Repo = (() => {
  const ss = () => SpreadsheetApp.getActive();

  function _readAll(sheetName) {
    const sh = ss().getSheetByName(sheetName);
    if (!sh) throw new Error('Aba não encontrada: ' + sheetName);
    const values = sh.getDataRange().getValues();
    const [head, ...rows] = values;
    return rows.filter(r => r[0] !== '').map(r => {
      const obj = {};
      head.forEach((k, i) => obj[k] = r[i]);
      return obj;
    });
  }

  function _append(sheetName, obj) {
    const sh = ss().getSheetByName(sheetName);
    const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const row = head.map(k => obj[k] === undefined ? '' : obj[k]);
    sh.appendRow(row);
  }

  function _updateById(sheetName, idCol, idVal, patch) {
    const sh = ss().getSheetByName(sheetName);
    const data = sh.getDataRange().getValues();
    const head = data[0];
    const idIdx = head.indexOf(idCol);
    for (let r = 1; r < data.length; r++) {
      if (data[r][idIdx] === idVal) {
        Object.keys(patch).forEach(k => {
          const c = head.indexOf(k);
          if (c >= 0) sh.getRange(r + 1, c + 1).setValue(patch[k]);
        });
        return true;
      }
    }
    return false;
  }

  return {
    readConfigOpcoes() {
      const rows = _readAll('_CONFIG_OPCOES');
      const out = {};
      rows.forEach(r => out[r.chave] = String(r.valor).split('|'));
      return out;
    },
    readCargos() {
      return _readAll('_CONFIG_CARGOS').filter(c => c.ativo === 'sim').map(c => c.nome_cargo);
    },
    readRoteiro(cargo) {
      const rows = _readAll('_CONFIG_ROTEIRO');
      return rows
        .filter(r => r.cargo === 'TODOS' || r.cargo === cargo)
        .sort((a, b) => a.ordem - b.ordem);
    },
    readCriterios() {
      return _readAll('_CONFIG_CRITERIOS').filter(c => c.ativo === 'sim');
    },
    filiais() {
      return _readAll('_CONFIG_FILIAIS').filter(f => f.ativa === 'sim');
    },
    filialPorCodigo(codigo) {
      return this.filiais().find(f => String(f.codigo) === String(codigo));
    },
    filialPorHash(hash) {
      return this.filiais().find(f => f.senha_hash === hash);
    },
    admin() {
      return _readAll('_CONFIG_ADMIN')[0];
    },

    appendEntrevista(filialCodigo, obj) {
      const filial = this.filialPorCodigo(filialCodigo);
      _append(nomeAbaFilial(filial), obj);
    },
    updateEntrevista(filialCodigo, idEntrevista, patch) {
      const filial = this.filialPorCodigo(filialCodigo);
      return _updateById(nomeAbaFilial(filial), 'id_entrevista', idEntrevista, patch);
    },
    findByCPFEmTodasFiliais(cpf) {
      const cpfLimpo = String(cpf).replace(/\D/g, '');
      const found = [];
      this.filiais().forEach(f => {
        const rows = _readAll(nomeAbaFilial(f));
        rows.forEach(r => {
          if (String(r.cpf).replace(/\D/g, '') === cpfLimpo) {
            found.push(Object.assign({ filial: f.codigo }, r));
          }
        });
      });
      return found;
    },
    listFilial(filialCodigo) {
      const filial = this.filialPorCodigo(filialCodigo);
      return _readAll(nomeAbaFilial(filial));
    },
    listTodas() {
      const all = [];
      this.filiais().forEach(f => {
        _readAll(nomeAbaFilial(f)).forEach(r => all.push(Object.assign({ filial: f.codigo }, r)));
      });
      return all;
    },

    appendHistorico(obj) { _append('_LOG_HISTORICO', obj); },
    appendAcesso(obj)    { _append('_LOG_ACESSOS', obj); },

    upsertCargo(nome, ativo) {
      const sh = ss().getSheetByName('_CONFIG_CARGOS');
      const data = sh.getDataRange().getValues();
      for (let r = 1; r < data.length; r++) {
        if (data[r][0] === nome) { sh.getRange(r + 1, 2).setValue(ativo); return; }
      }
      sh.appendRow([nome, ativo]);
    },
    upsertRoteiro(item) {
      const sh = ss().getSheetByName('_CONFIG_ROTEIRO');
      const data = sh.getDataRange().getValues();
      const head = data[0];
      for (let r = 1; r < data.length; r++) {
        if (data[r][0] === item.id) {
          head.forEach((k, c) => sh.getRange(r + 1, c + 1).setValue(item[k]));
          return;
        }
      }
      sh.appendRow(head.map(k => item[k] || ''));
    },
    deleteRoteiro(id) {
      const sh = ss().getSheetByName('_CONFIG_ROTEIRO');
      const data = sh.getDataRange().getValues();
      for (let r = 1; r < data.length; r++) {
        if (data[r][0] === id) { sh.deleteRow(r + 1); return; }
      }
    },
    upsertCriterio(item) {
      const sh = ss().getSheetByName('_CONFIG_CRITERIOS');
      const data = sh.getDataRange().getValues();
      const head = data[0];
      for (let r = 1; r < data.length; r++) {
        if (data[r][0] === item.id) {
          head.forEach((k, c) => sh.getRange(r + 1, c + 1).setValue(item[k]));
          return;
        }
      }
      sh.appendRow(head.map(k => item[k] || ''));
    },
    setFilialSenhaHash(codigo, hash) {
      const sh = ss().getSheetByName('_CONFIG_FILIAIS');
      const data = sh.getDataRange().getValues();
      for (let r = 1; r < data.length; r++) {
        if (String(data[r][0]) === String(codigo)) { sh.getRange(r + 1, 3).setValue(hash); return; }
      }
    },
  };
})();
