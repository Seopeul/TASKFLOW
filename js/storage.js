/*
 * TaskFlow — camada de dados.
 * Tudo fica no navegador (localStorage); não existe servidor.
 *
 * Chaves usadas:
 *   taskflow:usuarios            -> lista de usuários (sem senha em texto puro)
 *   taskflow:tarefas:<id_usuario> -> tarefas de UM usuário (uma chave por usuário)
 *   taskflow:sessao (sessionStorage) -> id do usuário logado nesta aba
 */
(function (global) {
  "use strict";

  const KEYS = {
    users: "taskflow:usuarios",
    session: "taskflow:sessao",
    tasks: function (idUsuario) { return "taskflow:tarefas:" + idUsuario; },
  };

  function read(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false; // armazenamento bloqueado ou cheio
    }
  }

  function newId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function isAvailable() {
    try {
      const k = "taskflow:teste";
      global.localStorage.setItem(k, "1");
      global.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  global.TaskFlowStore = {
    newId: newId,
    isAvailable: isAvailable,

    getUsers: function () { return read(KEYS.users, []); },
    saveUsers: function (users) { return write(KEYS.users, users); },

    getSession: function () {
      try { return global.sessionStorage.getItem(KEYS.session); } catch (e) { return null; }
    },
    setSession: function (idUsuario) {
      try { global.sessionStorage.setItem(KEYS.session, idUsuario); } catch (e) { /* ignora */ }
    },
    clearSession: function () {
      try { global.sessionStorage.removeItem(KEYS.session); } catch (e) { /* ignora */ }
    },

    getTasks: function (idUsuario) { return read(KEYS.tasks(idUsuario), []); },
    saveTasks: function (idUsuario, tasks) { return write(KEYS.tasks(idUsuario), tasks); },
  };
})(window);
