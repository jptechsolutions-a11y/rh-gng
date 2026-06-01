// src/Utils.gs — helpers puros

const SALT = 'rh-gng-v1-static-salt';

function uuid() {
  return Utilities.getUuid().toUpperCase().slice(0, 8);
}

function sha256(text) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    SALT + text,
    Utilities.Charset.UTF_8
  );
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function validaCPF(cpf) {
  if (typeof cpf !== 'string') return false;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  const calc = (slice) => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) {
      sum += parseInt(slice[i], 10) * (slice.length + 1 - i);
    }
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(digits.slice(0, 9)) === parseInt(digits[9], 10)
      && calc(digits.slice(0, 10)) === parseInt(digits[10], 10);
}

function gerarIdEntrevista() {
  const d = new Date();
  const yyyymmdd = Utilities.formatDate(d, 'America/Sao_Paulo', 'yyyyMMdd');
  return 'ENT-' + yyyymmdd + '-' + uuid().slice(0, 4);
}

function nowISO() {
  return Utilities.formatDate(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ss");
}
