/*
 * TaskFlow — interface e regras das tarefas.
 *
 * Requisitos funcionais:
 *   RF01 Cadastrar tarefa   RF02 Editar tarefa      RF03 Definir prazo
 *   RF04 Listar tarefas     RF05 Marcar como concluída   RF06 Excluir tarefa
 *
 * Modelo de dados da tarefa: id_tarefa, titulo, descricao, prazo, status
 * (+ id_usuario, que liga a tarefa ao dono dela).
 */
(function () {
  "use strict";

  const Store = window.TaskFlowStore;
  const Auth = window.TaskFlowAuth;

  const PENDENTE = "pendente";
  const CONCLUIDA = "concluida";

  const state = { user: null, tasks: [], editingId: null, detailId: null, formFrom: "list" };

  function $(sel) { return document.querySelector(sel); }

  // ---------- utilidades ----------
  function formatDate(iso) {
    const p = String(iso || "").split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : "—";
  }

  function plural(n, um, varios) { return n + " " + (n === 1 ? um : varios); }

  function sortedTasks() {
    return state.tasks.slice().sort(function (a, b) {
      if (a.prazo !== b.prazo) return a.prazo < b.prazo ? -1 : 1;
      return String(a.criada_em).localeCompare(String(b.criada_em));
    });
  }

  function findTask(id) {
    return state.tasks.find(function (t) { return t.id_tarefa === id; }) || null;
  }

  function persist() {
    if (!Store.saveTasks(state.user.id_usuario, state.tasks)) {
      showBanner("Não foi possível salvar as alterações neste navegador.");
      return false;
    }
    return true;
  }

  function showBanner(msg) {
    const b = $("#banner");
    b.textContent = msg;
    b.hidden = !msg;
  }

  function setError(id, msg) {
    const el = $(id);
    el.textContent = msg || "";
    el.hidden = !msg;
  }

  // ---------- navegação entre telas ----------
  function show(name) {
    ["auth", "list", "form", "detail"].forEach(function (v) {
      $("#view-" + v).hidden = v !== name;
    });
    $("#user-box").hidden = !state.user;
    const heading = $("#view-" + name + " h1");
    if (heading) heading.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function selectTab(tab) {
    const isLogin = tab === "login";
    $("#tab-login").setAttribute("aria-selected", String(isLogin));
    $("#tab-register").setAttribute("aria-selected", String(!isLogin));
    $("#form-login").hidden = !isLogin;
    $("#form-register").hidden = isLogin;
    setError("#login-error", "");
    setError("#register-error", "");
  }

  function enterApp(user) {
    state.user = user;
    state.tasks = Store.getTasks(user.id_usuario);
    $("#user-name").textContent = user.nome;
    renderList();
    show("list");
  }

  // ---------- tela 01: lista (RF04, RF05) ----------
  function renderList() {
    const ul = $("#task-list");
    ul.replaceChildren();
    const tasks = sortedTasks();
    const done = tasks.filter(function (t) { return t.status === CONCLUIDA; }).length;

    $("#empty").hidden = tasks.length > 0;
    $("#summary").textContent = tasks.length
      ? plural(tasks.length - done, "pendente", "pendentes") + " · " + plural(done, "concluída", "concluídas")
      : "";

    tasks.forEach(function (t) {
      const isDone = t.status === CONCLUIDA;
      const li = document.createElement("li");
      li.className = "task" + (isDone ? " done" : "");

      const check = document.createElement("button");
      check.type = "button";
      check.className = "check";
      check.setAttribute("aria-pressed", String(isDone));
      check.setAttribute("aria-label", (isDone ? "Reabrir tarefa: " : "Concluir tarefa: ") + t.titulo);
      check.addEventListener("click", function () { toggleStatus(t.id_tarefa); });

      const main = document.createElement("button");
      main.type = "button";
      main.className = "task-main";
      const title = document.createElement("span");
      title.className = "task-title";
      title.textContent = t.titulo;
      const meta = document.createElement("span");
      meta.className = "task-meta";
      meta.textContent = "prazo: " + formatDate(t.prazo) + (isDone ? " · concluída" : "");
      main.append(title, meta);
      main.addEventListener("click", function () { openDetail(t.id_tarefa); });

      li.append(check, main);
      ul.append(li);
    });
  }

  // ---------- RF05: alterna pendente <-> concluída ----------
  function toggleStatus(id, fromDetail) {
    const t = findTask(id);
    if (!t) return;
    t.status = t.status === CONCLUIDA ? PENDENTE : CONCLUIDA;
    if (!persist()) return;
    renderList();
    if (fromDetail) show("list");
  }

  // ---------- tela 02: formulário (RF01, RF02, RF03) ----------
  function openForm(id) {
    state.editingId = id || null;
    state.formFrom = id ? "detail" : "list";
    const t = id ? findTask(id) : null;
    $("#form-title").textContent = t ? "Editar tarefa" : "Nova tarefa";
    $("#view-form .eyebrow").textContent = t ? "02 · editar tarefa" : "02 · nova tarefa";
    $("#f-titulo").value = t ? t.titulo : "";
    $("#f-descricao").value = t ? t.descricao : "";
    $("#f-prazo").value = t ? t.prazo : "";
    setError("#form-error", "");
    show("form");
  }

  function validateTask(titulo, descricao, prazo) {
    if (!titulo) return "Informe o título da tarefa.";
    if (titulo.length > 100) return "O título pode ter no máximo 100 caracteres.";
    if (descricao.length > 500) return "A descrição pode ter no máximo 500 caracteres.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(prazo) || isNaN(new Date(prazo + "T00:00:00").getTime())) {
      return "Informe um prazo válido.";
    }
    return "";
  }

  function submitTask(ev) {
    ev.preventDefault();
    const titulo = $("#f-titulo").value.trim();
    const descricao = $("#f-descricao").value.trim();
    const prazo = $("#f-prazo").value;

    const erro = validateTask(titulo, descricao, prazo);
    if (erro) { setError("#form-error", erro); return; }

    if (state.editingId) {
      const t = findTask(state.editingId);
      if (t) { t.titulo = titulo; t.descricao = descricao; t.prazo = prazo; }
    } else {
      state.tasks.push({
        id_tarefa: Store.newId(),
        id_usuario: state.user.id_usuario,
        titulo: titulo,
        descricao: descricao,
        prazo: prazo,
        status: PENDENTE,
        criada_em: new Date().toISOString(),
      });
    }
    if (!persist()) return;
    state.editingId = null;
    renderList();
    show("list");
  }

  // ---------- tela 03: detalhes (RF02, RF05, RF06) ----------
  function openDetail(id) {
    const t = findTask(id);
    if (!t) return;
    state.detailId = id;
    $("#d-titulo").textContent = t.titulo;
    $("#d-descricao").textContent = t.descricao || "—";
    $("#d-prazo").textContent = formatDate(t.prazo);
    $("#d-status").textContent = t.status === CONCLUIDA ? "concluída" : "pendente";
    $("#btn-toggle").textContent = t.status === CONCLUIDA ? "REABRIR" : "CONCLUIR";
    show("detail");
  }

  function deleteTask() {
    const t = findTask(state.detailId);
    if (!t) return;
    if (!window.confirm("Excluir a tarefa “" + t.titulo + "”?")) return;
    state.tasks = state.tasks.filter(function (x) { return x.id_tarefa !== t.id_tarefa; });
    if (!persist()) return;
    state.detailId = null;
    renderList();
    show("list");
  }

  // ---------- autenticação ----------
  async function onLogin(ev) {
    ev.preventDefault();
    setError("#login-error", "");
    const btn = ev.submitter;
    if (btn) btn.disabled = true;
    const res = await Auth.login({ email: $("#login-email").value, senha: $("#login-senha").value });
    if (btn) btn.disabled = false;
    if (!res.ok) { setError("#login-error", res.erro); return; }
    $("#form-login").reset();
    enterApp(res.user);
  }

  async function onRegister(ev) {
    ev.preventDefault();
    setError("#register-error", "");
    const btn = ev.submitter;
    if (btn) btn.disabled = true;
    const res = await Auth.register({
      nome: $("#reg-nome").value,
      email: $("#reg-email").value,
      senha: $("#reg-senha").value,
      senha2: $("#reg-senha2").value,
    });
    if (btn) btn.disabled = false;
    if (!res.ok) { setError("#register-error", res.erro); return; }
    $("#form-register").reset();
    enterApp(res.user);
  }

  function onLogout() {
    Auth.logout();
    state.user = null;
    state.tasks = [];
    state.editingId = null;
    state.detailId = null;
    selectTab("login");
    show("auth");
  }

  // ---------- inicialização ----------
  function init() {
    document.querySelectorAll("[data-tab]").forEach(function (b) {
      b.addEventListener("click", function () { selectTab(b.dataset.tab); });
    });
    $("#form-login").addEventListener("submit", onLogin);
    $("#form-register").addEventListener("submit", onRegister);
    $("#btn-logout").addEventListener("click", onLogout);

    $("#btn-new").addEventListener("click", function () { openForm(null); });
    $("#task-form").addEventListener("submit", submitTask);
    $("#btn-cancel").addEventListener("click", function () {
      state.editingId = null;
      if (state.formFrom === "detail" && findTask(state.detailId)) openDetail(state.detailId); else show("list");
    });

    $("#btn-edit").addEventListener("click", function () { openForm(state.detailId); });
    $("#btn-toggle").addEventListener("click", function () { toggleStatus(state.detailId, true); });
    $("#btn-delete").addEventListener("click", deleteTask);
    $("#btn-back").addEventListener("click", function () { show("list"); });

    if (!Store.isAvailable()) {
      showBanner("O armazenamento local do navegador está bloqueado (modo privado ou configuração). O TaskFlow precisa dele para guardar contas e tarefas.");
    } else if (!Auth.hasCrypto()) {
      showBanner("Este navegador não oferece a Web Crypto API neste contexto. Abra o projeto com um servidor local (veja o README) para criar conta e entrar.");
    }

    const user = Auth.currentUser();
    if (user) enterApp(user); else show("auth");
  }

  init();
})();
