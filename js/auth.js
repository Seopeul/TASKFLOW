/*
 * TaskFlow — autenticação (cadastro, login, logout).
 *
 * A senha nunca é guardada em texto puro: guardamos um sal aleatório e o
 * resultado de PBKDF2-SHA256 (Web Crypto API).
 * ATENÇÃO: é uma demonstração acadêmica sem servidor. Quem tem acesso ao
 * navegador consegue ler o localStorage; não use senhas reais importantes.
 */
(function (global) {
  "use strict";

  const Store = global.TaskFlowStore;
  const ITERATIONS = 150000;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function hasCrypto() {
    return !!(global.crypto && global.crypto.subtle && global.crypto.getRandomValues);
  }

  function toB64(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return global.btoa(s);
  }

  function fromB64(str) {
    const bin = global.atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function derive(password, saltBytes) {
    const key = await global.crypto.subtle.importKey(
      "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
    );
    const bits = await global.crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: saltBytes, iterations: ITERATIONS, hash: "SHA-256" }, key, 256
    );
    return toB64(new Uint8Array(bits));
  }

  function sameString(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  function normalizeEmail(email) { return String(email || "").trim().toLowerCase(); }

  function publicUser(u) { return { id_usuario: u.id_usuario, nome: u.nome, email: u.email }; }

  async function register(data) {
    const nome = String(data.nome || "").trim();
    const email = normalizeEmail(data.email);
    const senha = String(data.senha || "");
    const senha2 = String(data.senha2 || "");

    if (nome.length < 2) return { ok: false, erro: "Informe seu nome (mínimo 2 caracteres)." };
    if (!EMAIL_RE.test(email)) return { ok: false, erro: "Informe um e-mail válido." };
    if (senha.length < 8) return { ok: false, erro: "A senha precisa ter no mínimo 8 caracteres." };
    if (senha !== senha2) return { ok: false, erro: "As senhas não conferem." };
    if (!hasCrypto()) return { ok: false, erro: "Este navegador não oferece a Web Crypto API. Abra o projeto por um servidor local (veja o README)." };

    const users = Store.getUsers();
    if (users.some(function (u) { return u.email === email; })) {
      return { ok: false, erro: "Já existe uma conta com esse e-mail." };
    }

    const salt = global.crypto.getRandomValues(new Uint8Array(16));
    const user = {
      id_usuario: Store.newId(),
      nome: nome,
      email: email,
      salt: toB64(salt),
      hash: await derive(senha, salt),
      criado_em: new Date().toISOString(),
    };
    users.push(user);
    if (!Store.saveUsers(users)) {
      return { ok: false, erro: "Não foi possível salvar os dados neste navegador." };
    }
    Store.setSession(user.id_usuario);
    return { ok: true, user: publicUser(user) };
  }

  async function login(data) {
    const email = normalizeEmail(data.email);
    const senha = String(data.senha || "");
    const generic = { ok: false, erro: "E-mail ou senha incorretos." };

    if (!email || !senha) return { ok: false, erro: "Informe e-mail e senha." };
    if (!hasCrypto()) return { ok: false, erro: "Este navegador não oferece a Web Crypto API. Abra o projeto por um servidor local (veja o README)." };

    const user = Store.getUsers().find(function (u) { return u.email === email; });
    if (!user) {
      await derive(senha, new Uint8Array(16)); // custo semelhante ao de um login real
      return generic;
    }
    const hash = await derive(senha, fromB64(user.salt));
    if (!sameString(hash, user.hash)) return generic;

    Store.setSession(user.id_usuario);
    return { ok: true, user: publicUser(user) };
  }

  function logout() { Store.clearSession(); }

  function currentUser() {
    const id = Store.getSession();
    if (!id) return null;
    const user = Store.getUsers().find(function (u) { return u.id_usuario === id; });
    return user ? publicUser(user) : null;
  }

  global.TaskFlowAuth = {
    hasCrypto: hasCrypto,
    register: register,
    login: login,
    logout: logout,
    currentUser: currentUser,
  };
})(window);
