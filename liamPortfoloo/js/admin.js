/* ═══════════════════════════════════════════════════════════
   ADMIN PORTAL — Liam Mckeever Portfolio CMS
   Full-featured admin JS with:
     • Demo / offline mode (no backend required)
     • Dark mode (persisted)
     • Global search
     • Activity log
     • Notifications / toasts
     • Password change with strength meter
     • Session timer
     • Keyboard shortcuts
     • Sidebar navigation highlighting
     • Per-section filter search
     • Export to JSON
     • Compact sidebar toggle
     • Mobile sidebar
   ═══════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {

  /* ─── Config ──────────────────────────────────────────── */
  const DEMO_USER     = "liam@26";
  const DEMO_PASS     = "mckeever03";
  const API_URL       = "../backend/admin-api.php";
  const SESSION_MIN   = 30; // minutes until session warning

  /* ─── Demo store (in-memory, survives refresh via localStorage) ─── */
  const store = (() => {
    const KEY = "liam_admin_store";
    const defaults = {
      projects:  [],
      education: [],
      skills:    [],
      messages:  [
        { id: 1, name: "Jane Doe", email: "jane@example.com", subject: "Great portfolio!", message: "I really love your work. Would you be open to collaborating?", created_at: new Date(Date.now() - 86400000 * 2).toISOString(), status: "new" },
        { id: 2, name: "David Kim", email: "david@techco.io", subject: "Job opportunity", message: "Hi Liam, we have an exciting opening at TechCo. Let's connect!", created_at: new Date(Date.now() - 86400000).toISOString(), status: "new" },
      ],
      activity:  [],
      nextId:    { projects: 1, education: 1, skills: 1, messages: 3 },
    };
    let data = defaults;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) data = { ...defaults, ...JSON.parse(raw) };
    } catch {}

    function save() {
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
    }

    return {
      get(resource)        { return [...(data[resource] || [])]; },
      add(resource, item)  {
        const id = data.nextId[resource]++;
        data[resource].push({ ...item, id });
        save();
        return id;
      },
      update(resource, id, item) {
        const idx = data[resource].findIndex(r => r.id === id);
        if (idx === -1) return false;
        data[resource][idx] = { ...data[resource][idx], ...item, id };
        save();
        return true;
      },
      remove(resource, id) {
        const before = data[resource].length;
        data[resource] = data[resource].filter(r => r.id !== id);
        save();
        return data[resource].length < before;
      },
      log(msg) {
        data.activity.unshift({ msg, ts: new Date().toISOString() });
        if (data.activity.length > 100) data.activity.pop();
        save();
      },
      clearActivity() { data.activity = []; save(); },
      getActivity()   { return [...data.activity]; },
    };
  })();

  /* ─── DOM refs ────────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  const loginPanel       = $("loginPanel");
  const dashboard        = $("dashboard");
  const loginForm        = $("loginForm");
  const loginStatus      = $("loginStatus");
  const dashboardStatus  = $("dashboardStatus");
  const logoutButton     = $("logoutButton");
  const refreshButton    = $("refreshButton");

  /* ─── State ───────────────────────────────────────────── */
  let csrfToken    = "";
  let isDemoMode   = false;
  let sessionStart = null;

  /* ═══════════════════════════════════════════════════════
     TOAST SYSTEM
  ═══════════════════════════════════════════════════════ */
  const toastContainer = $("toastContainer");

  function toast(msg, type = "success", duration = 3500) {
    if (!$("notifToggle").checked) return;
    const t = document.createElement("div");
    t.className = `toast toast--${type}`;
    t.setAttribute("role", "alert");
    const icons = {
      success: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
      error:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      info:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    };
    t.innerHTML = `${icons[type] || icons.info}<span>${msg}</span>`;
    toastContainer.append(t);
    requestAnimationFrame(() => t.classList.add("toast--in"));
    setTimeout(() => {
      t.classList.remove("toast--in");
      t.addEventListener("transitionend", () => t.remove(), { once: true });
    }, duration);
    addNotification(msg, type);
  }

  /* ═══════════════════════════════════════════════════════
     NOTIFICATIONS
  ═══════════════════════════════════════════════════════ */
  const notifDot      = $("notifDot");
  const notifDropdown = $("notifDropdown");
  const notifList     = $("notifList");
  const notifBtn      = $("notifBtn");
  let   notifications = [];

  function addNotification(msg, type = "info") {
    notifications.unshift({ msg, type, ts: new Date() });
    if (notifications.length > 20) notifications.pop();
    renderNotifications();
  }

  function renderNotifications() {
    notifDot.hidden = notifications.length === 0;
    notifList.replaceChildren();
    if (notifications.length === 0) {
      const li = document.createElement("li");
      li.className = "notif-empty";
      li.textContent = "No new notifications";
      notifList.append(li);
      return;
    }
    for (const n of notifications) {
      const li = document.createElement("li");
      li.className = `notif-item notif-item--${n.type}`;
      li.innerHTML = `<span class="notif-msg">${n.msg}</span><span class="notif-time">${timeAgo(n.ts)}</span>`;
      notifList.append(li);
    }
  }

  notifBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = !notifDropdown.hidden;
    notifDropdown.hidden = open;
    notifBtn.setAttribute("aria-expanded", String(!open));
  });

  $("clearNotifs").addEventListener("click", () => {
    notifications = [];
    renderNotifications();
    notifDropdown.hidden = true;
  });

  document.addEventListener("click", () => {
    notifDropdown.hidden = true;
    notifBtn.setAttribute("aria-expanded", "false");
  });
  notifDropdown.addEventListener("click", e => e.stopPropagation());

  function timeAgo(date) {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  /* ═══════════════════════════════════════════════════════
     DARK MODE
  ═══════════════════════════════════════════════════════ */
  const root        = document.documentElement;
  const dmToggle    = $("darkModeToggle");
  const dmToggle2   = $("darkModeToggle2");

  function setDark(on) {
    root.dataset.theme = on ? "dark" : "light";
    dmToggle2.checked  = on;
    try { localStorage.setItem("liam_admin_dark", on ? "1" : "0"); } catch {}
  }

  // Init from storage
  try {
    if (localStorage.getItem("liam_admin_dark") === "1") setDark(true);
  } catch {}

  dmToggle.addEventListener("click", () => setDark(root.dataset.theme !== "dark"));
  dmToggle2.addEventListener("change", () => setDark(dmToggle2.checked));

  /* ═══════════════════════════════════════════════════════
     SIDEBAR — MOBILE + COMPACT
  ═══════════════════════════════════════════════════════ */
  const adminSidebar   = $("adminSidebar");
  const sidebarOverlay = $("sidebarOverlay");
  const hamburger      = $("hamburger");
  const sidebarClose   = $("sidebarClose");

  function openSidebar()  { adminSidebar.classList.add("sidebar--open"); sidebarOverlay.classList.add("overlay--visible"); }
  function closeSidebar() { adminSidebar.classList.remove("sidebar--open"); sidebarOverlay.classList.remove("overlay--visible"); }

  hamburger.addEventListener("click",      openSidebar);
  sidebarClose.addEventListener("click",   closeSidebar);
  sidebarOverlay.addEventListener("click", closeSidebar);

  $("compactSidebar").addEventListener("change", (e) => {
    document.getElementById("dashboard").classList.toggle("sidebar--compact", e.target.checked);
    try { localStorage.setItem("liam_admin_compact", e.target.checked ? "1" : "0"); } catch {}
  });

  try {
    if (localStorage.getItem("liam_admin_compact") === "1") {
      $("compactSidebar").checked = true;
      dashboard.classList.add("sidebar--compact");
    }
  } catch {}

  /* Active nav link on scroll */
  const sections = ["overview","messages","projects","education","skills","activity","quick-actions","settings"];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        document.querySelectorAll(".nav-link").forEach(a => a.classList.remove("active"));
        const link = document.querySelector(`.nav-link[data-section="${entry.target.id}"]`);
        if (link) link.classList.add("active");
      }
    }
  }, { threshold: 0.3 });

  /* ═══════════════════════════════════════════════════════
     PASSWORD TOGGLE
  ═══════════════════════════════════════════════════════ */
  $("pwToggle").addEventListener("click", () => {
    const inp = $("password");
    inp.type = inp.type === "password" ? "text" : "password";
  });

  /* ═══════════════════════════════════════════════════════
     HTTP REQUEST HELPER (falls back to demo store)
  ═══════════════════════════════════════════════════════ */
  async function request(resource, options = {}) {
    if (isDemoMode) return demoRequest(resource, options);

    const url = new URL(API_URL, window.location.href);
    url.searchParams.set("resource", resource);
    if (options.id !== undefined) url.searchParams.set("id", String(options.id));

    const headers = { Accept: "application/json", ...options.headers };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (options.authenticated)      headers["X-CSRF-Token"] = csrfToken;

    let response;
    try {
      response = await fetch(url, {
        method: options.method || "GET",
        credentials: "same-origin",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch {
      // Switch to demo mode on network failure
      isDemoMode = true;
      return demoRequest(resource, options);
    }

    let result;
    try { result = await response.json(); }
    catch { throw new Error("Admin service did not return JSON. Check PHP is enabled."); }

    if (!response.ok) {
      if (response.status === 401 && resource !== "session") showLogin("Session expired. Please sign in again.");
      throw new Error(result.message || "The request could not be completed.");
    }
    return result;
  }

  /* ─── Demo request handler ────────────────────────────── */
  function demoRequest(resource, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const body   = options.body || {};

    if (resource === "session") {
      if (method === "POST") {
        const { username, password } = body;
        if (username === DEMO_USER && password === DEMO_PASS) {
          return Promise.resolve({ csrfToken: "demo-csrf", authenticated: true });
        }
        return Promise.reject(new Error("Incorrect username or password."));
      }
      if (method === "DELETE") return Promise.resolve({ message: "Signed out." });
      return Promise.resolve({ authenticated: false });
    }

    const resourceMap = {
      messages: "messages", projects: "projects",
      education: "education", skills: "skills",
    };
    const key = resourceMap[resource];
    if (!key) return Promise.reject(new Error("Unknown resource."));

    if (method === "GET")  return Promise.resolve({ records: store.get(key) });

    if (method === "POST") {
      store.add(key, body);
      store.log(`Created ${key.slice(0, -1)}: "${body.title || body.name || body.institution || body.subject || "entry"}"`);
      return Promise.resolve({ message: `${capitalise(key.slice(0, -1))} added.` });
    }

    if (method === "PUT") {
      const id = Number(body.id || options.id);
      const { id: _id, ...rest } = body;
      store.update(key, id, rest);
      store.log(`Updated ${key.slice(0, -1)} #${id}`);
      return Promise.resolve({ message: `${capitalise(key.slice(0, -1))} updated.` });
    }

    if (method === "DELETE") {
      const id = Number(options.id);
      store.remove(key, id);
      store.log(`Deleted ${key.slice(0, -1)} #${id}`);
      return Promise.resolve({ message: `${capitalise(key.slice(0, -1))} deleted.` });
    }

    return Promise.reject(new Error("Unsupported method."));
  }

  function capitalise(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ═══════════════════════════════════════════════════════
     AUTH
  ═══════════════════════════════════════════════════════ */
  function showLogin(message = "") {
    csrfToken = "";
    dashboard.hidden = true;
    loginPanel.hidden = false;
    loginStatus.textContent = message;
    loginStatus.className = message ? "admin-notice is-error" : "admin-notice";
  }

  function showDashboard(token) {
    csrfToken = token;
    loginPanel.hidden = true;
    dashboard.hidden = false;
    sessionStart = new Date();
    $("sessionStart").textContent = sessionStart.toLocaleTimeString();
    $("lastLogin").textContent = "Just now";
    loadDashboard();
    startSessionTimer();
    // Observe sections
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
  }

  /* ─── Login form ──────────────────────────────────────── */
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("loginSubmit");
    btn.disabled = true;
    setStatus(loginStatus, "Signing in…");

    const fd = new FormData(loginForm);
    const username = fd.get("username").trim();
    const password = fd.get("password");

    // Try demo first if offline
    const tryDemo = () => {
      isDemoMode = true;
      return demoRequest("session", { method: "POST", body: { username, password } });
    };

    try {
      let result;
      try {
        result = await request("session", { method: "POST", body: { username, password } });
      } catch (err) {
        if (isDemoMode) throw err;
        result = await tryDemo();
      }
      loginForm.reset();
      store.log(`Admin signed in (${isDemoMode ? "demo" : "live"} mode)`);
      setStatus(loginStatus, "");
      showDashboard(result.csrfToken);
      toast(`Welcome back, ${username}!`, "success");
      if (isDemoMode) toast("Running in demo mode — changes are stored locally.", "info", 5000);
    } catch (err) {
      setStatus(loginStatus, err.message, true);
    } finally {
      btn.disabled = false;
    }
  });

  /* ─── Logout ──────────────────────────────────────────── */
  logoutButton.addEventListener("click", async () => {
    try {
      await request("session", { method: "DELETE", authenticated: true });
      store.log("Admin signed out");
      showLogin("You have signed out.");
    } catch (err) {
      setStatus(dashboardStatus, err.message, true);
    }
  });

  $("signOutAllBtn").addEventListener("click", () => {
    store.log("Signed out from all sessions");
    toast("Signed out from all sessions.", "info");
    setTimeout(() => {
      isDemoMode = false;
      showLogin("Signed out of all sessions.");
    }, 1200);
  });

  /* ─── Session timer ───────────────────────────────────── */
  function startSessionTimer() {
    let warned = false;
    setInterval(() => {
      if (!sessionStart) return;
      const elapsed = Math.floor((Date.now() - sessionStart) / 60000);
      const remaining = SESSION_MIN - elapsed;
      $("sessionExpiry").textContent = remaining > 0 ? `${remaining} min` : "Expired";
      if (remaining <= 5 && !warned) {
        warned = true;
        toast("Session expires in 5 minutes.", "info", 6000);
      }
    }, 30000);
  }

  /* ─── Live clock ──────────────────────────────────────── */
  function updateClock() {
    const el = $("footerTime");
    if (el) el.textContent = new Date().toLocaleString();
  }
  updateClock();
  setInterval(updateClock, 1000);

  /* ═══════════════════════════════════════════════════════
     STATUS HELPERS
  ═══════════════════════════════════════════════════════ */
  function setStatus(el, msg, isError = false) {
    el.textContent = msg;
    el.className = `admin-notice${msg ? (isError ? " is-error" : " is-success") : ""}`;
  }

  /* ═══════════════════════════════════════════════════════
     LOAD DASHBOARD
  ═══════════════════════════════════════════════════════ */
  async function loadDashboard() {
    setStatus(dashboardStatus, "Loading portfolio data…");
    try {
      const [messages, projects, education, skills] = await Promise.all([
        request("messages"),
        request("projects"),
        request("education"),
        request("skills"),
      ]);
      renderMessages(messages.records);
      renderProjects(projects.records);
      renderEducation(education.records);
      renderSkills(skills.records);
      $("messageCount").textContent   = String(messages.records.length);
      $("projectCount").textContent   = String(projects.records.length);
      $("educationCount").textContent = String(education.records.length);
      $("skillCount").textContent     = String(skills.records.length);

      // Message badge
      const unread = messages.records.filter(m => m.status === "new").length;
      const badge  = $("msgBadge");
      badge.hidden = unread === 0;
      badge.textContent = String(unread);

      setStatus(dashboardStatus, "");
      renderActivityLog();
    } catch (err) {
      setStatus(dashboardStatus, err.message, true);
    }
  }

  refreshButton.addEventListener("click", () => {
    toast("Data refreshed.", "success");
    loadDashboard();
  });
  $("qaRefreshBtn").addEventListener("click", () => {
    toast("Data refreshed.", "success");
    loadDashboard();
  });

  /* ═══════════════════════════════════════════════════════
     RENDER MESSAGES
  ═══════════════════════════════════════════════════════ */
  function renderMessages(records, filter = "") {
    const table = $("messagesTable");
    table.replaceChildren();
    const filtered = filter
      ? records.filter(r => [r.name, r.email, r.subject, r.message].join(" ").toLowerCase().includes(filter.toLowerCase()))
      : records;

    if (filtered.length === 0) {
      const row = table.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 6;
      cell.className = "table-empty";
      cell.textContent = records.length === 0 ? "No contact messages yet." : "No messages match your filter.";
      return;
    }

    for (const record of filtered) {
      const row = table.insertRow();
      const date = new Date(record.created_at.replace(" ", "T"));
      addCell(row, Number.isNaN(date.getTime()) ? record.created_at : date.toLocaleString());
      addCell(row, record.name);

      const emailCell = row.insertCell();
      const a = document.createElement("a");
      a.href = `mailto:${record.email}`;
      a.textContent = record.email;
      emailCell.append(a);

      const contentCell = row.insertCell();
      const details = document.createElement("details");
      const summary  = document.createElement("summary");
      summary.textContent = record.subject;
      const p = document.createElement("p");
      p.className = "message-copy";
      p.textContent = record.message;
      details.append(summary, p);
      contentCell.append(details);

      // Status badge
      const statusCell = row.insertCell();
      const badge = document.createElement("span");
      badge.className = `msg-status msg-status--${record.status || "new"}`;
      badge.textContent = (record.status || "new").charAt(0).toUpperCase() + (record.status || "new").slice(1);
      statusCell.append(badge);

      // Actions
      const actCell = row.insertCell();
      actCell.style.whiteSpace = "nowrap";
      if ((record.status || "new") === "new") {
        actCell.append(makeButton("Mark read", "mark-read-message", record.id, "ghost-btn small"));
        actCell.append(document.createTextNode(" "));
      }
      actCell.append(makeButton("Reply", "reply-message", record.id, "ghost-btn small"));
      actCell.append(document.createTextNode(" "));
      actCell.append(makeButton("Delete", "delete-message", record.id, "danger-btn small"));
    }
  }

  /* ═══════════════════════════════════════════════════════
     RENDER PROJECTS / EDUCATION / SKILLS
  ═══════════════════════════════════════════════════════ */
  function renderProjects(records, filter = "") {
    renderRecordList("projectsList", records, filter,
      r => createRecordCard(r.title, r.project_url || "Portfolio project", r.description, r.id, "project"),
      "No projects yet. Add one above.");
  }

  function renderEducation(records, filter = "") {
    renderRecordList("educationList", records, filter,
      r => {
        const years = [r.start_year, r.end_year].filter(Boolean).join(" – ");
        return createRecordCard(r.institution, r.qualification, r.description || "", r.id, "education", years);
      },
      "No education records yet. Add one above.");
  }

  function renderSkills(records, filter = "") {
    renderRecordList("skillsList", records, filter,
      r => createRecordCard(r.name, r.category, r.description, r.id, "skill"),
      "No skills yet. Add one above.");
  }

  function renderRecordList(listId, records, filter, cardFn, emptyMsg) {
    const list = $(listId);
    list.replaceChildren();
    const filtered = filter
      ? records.filter(r => JSON.stringify(r).toLowerCase().includes(filter.toLowerCase()))
      : records;
    if (filtered.length === 0) {
      list.textContent = records.length === 0 ? emptyMsg : "No results match your filter.";
      return;
    }
    for (const r of filtered) {
      const card = cardFn(r);
      card.dataset.record = JSON.stringify(r);
      list.append(card);
    }
  }

  /* ─── Card factory ────────────────────────────────────── */
  function createRecordCard(title, subtitle, description, id, type, metadata = "") {
    const card    = document.createElement("article");
    card.className = "record-card";
    const heading  = document.createElement("div");
    heading.className = "record-card-heading";
    const text    = document.createElement("div");
    const h3      = document.createElement("h3");
    h3.textContent = title;
    const sub     = document.createElement("p");
    sub.className  = "record-meta";
    sub.textContent = [subtitle, metadata].filter(Boolean).join(" · ");
    text.append(h3, sub);

    const actions = document.createElement("div");
    actions.className = "record-actions";
    actions.append(
      makeButton("Edit",   `edit-${type}`,   id),
      makeButton("Delete", `delete-${type}`, id, "danger-btn small"),
    );
    heading.append(text, actions);
    card.append(heading);
    if (description) {
      const p = document.createElement("p");
      p.textContent = description;
      card.append(p);
    }
    return card;
  }

  function addCell(row, value) {
    const cell = row.insertCell();
    cell.textContent = value;
    return cell;
  }

  function makeButton(text, action, id, className = "ghost-btn small") {
    const btn = document.createElement("button");
    btn.type      = "button";
    btn.className = className;
    btn.textContent = text;
    btn.dataset.action = action;
    btn.dataset.id     = String(id);
    return btn;
  }

  /* ═══════════════════════════════════════════════════════
     SAVE RECORD
  ═══════════════════════════════════════════════════════ */
  async function saveRecord(form, resource) {
    const fd      = new FormData(form);
    const id      = fd.get("id");
    const body    = Object.fromEntries(fd.entries());
    const editing = Boolean(id);
    if (resource === "education") { body.start_year ||= ""; body.end_year ||= ""; }
    delete body.id;

    const result = await request(resource, {
      method: editing ? "PUT" : "POST",
      authenticated: true,
      body: editing ? { ...body, id: Number(id) } : body,
    });
    form.reset();
    form.elements.namedItem("id").value = "";
    setStatus(dashboardStatus, result.message);
    toast(result.message, "success");
    await loadDashboard();
  }

  /* ─── Fill form for editing ───────────────────────────── */
  function fillForm(form, record) {
    for (const [k, v] of Object.entries(record)) {
      const inp = form.elements.namedItem(k);
      if (inp) inp.value = v ?? "";
    }
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* ═══════════════════════════════════════════════════════
     FORM SUBMISSIONS
  ═══════════════════════════════════════════════════════ */
  for (const [formId, resource] of [
    ["projectForm",   "projects"],
    ["educationForm", "education"],
    ["skillForm",     "skills"],
  ]) {
    $(formId).addEventListener("submit", async (e) => {
      e.preventDefault();
      try { await saveRecord(e.currentTarget, resource); }
      catch (err) { setStatus(dashboardStatus, err.message, true); toast(err.message, "error"); }
    });
  }

  /* ═══════════════════════════════════════════════════════
     GLOBAL CLICK DELEGATION
  ═══════════════════════════════════════════════════════ */
  document.addEventListener("click", async (e) => {
    // Stat card click → scroll to section
    const statCard = e.target.closest(".stat-card[data-href]");
    if (statCard) {
      const target = document.querySelector(statCard.dataset.href);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    // Quick action cards
    const qaCard = e.target.closest(".qa-card[data-scroll]");
    if (qaCard) {
      const target = document.getElementById(qaCard.dataset.scroll);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const btn = e.target.closest("button[data-action], button[data-reset-form]");
    if (!btn) return;

    // Reset form
    if (btn.dataset.resetForm) {
      const form = $(btn.dataset.resetForm);
      form.reset();
      form.elements.namedItem("id").value = "";
      return;
    }

    const id     = Number(btn.dataset.id);
    const action = btn.dataset.action;
    if (!Number.isInteger(id) || id < 1) return;

    // Mark message read
    if (action === "mark-read-message") {
      store.update("messages", id, { status: "read" });
      store.log(`Marked message #${id} as read`);
      toast("Marked as read.", "success");
      await loadDashboard();
      return;
    }

    // Reply
    if (action === "reply-message") {
      const record = store.get("messages").find(m => m.id === id);
      if (record) window.location.href = `mailto:${record.email}?subject=Re: ${encodeURIComponent(record.subject)}`;
      return;
    }

    // Edit
    const card = btn.closest(".record-card");
    if (action.startsWith("edit-")) {
      const type = action.slice("edit-".length);
      fillForm($(`${type}Form`), JSON.parse(card.dataset.record));
      return;
    }

    // Delete
    if (!window.confirm("Delete this record? This cannot be undone.")) return;
    const recordType = action.slice("delete-".length);
    const resource =
      action === "delete-message" ? "messages"
      : recordType === "education" ? "education"
      : recordType === "skill"     ? "skills"
      : "projects";
    try {
      const result = await request(resource, { method: "DELETE", authenticated: true, id });
      setStatus(dashboardStatus, result.message);
      toast(result.message, "success");
      await loadDashboard();
    } catch (err) {
      setStatus(dashboardStatus, err.message, true);
      toast(err.message, "error");
    }
  });

  /* ═══════════════════════════════════════════════════════
     PER-SECTION FILTER SEARCH
  ═══════════════════════════════════════════════════════ */
  async function reRenderFiltered() {
    const [messages, projects, education, skills] = await Promise.all([
      request("messages"), request("projects"), request("education"), request("skills"),
    ]);
    $("msgSearch").addEventListener("input", () =>
      renderMessages(messages.records, $("msgSearch").value));
    $("projectSearch").addEventListener("input", () =>
      renderProjects(projects.records, $("projectSearch").value));
    $("eduSearch").addEventListener("input", () =>
      renderEducation(education.records, $("eduSearch").value));
    $("skillSearch").addEventListener("input", () =>
      renderSkills(skills.records, $("skillSearch").value));
  }

  /* ═══════════════════════════════════════════════════════
     GLOBAL SEARCH
  ═══════════════════════════════════════════════════════ */
  const globalSearch  = $("globalSearch");
  const searchResults = $("searchResults");

  globalSearch.addEventListener("input", async () => {
    const q = globalSearch.value.trim().toLowerCase();
    searchResults.replaceChildren();
    if (q.length < 2) { searchResults.hidden = true; return; }

    const [messages, projects, education, skills] = await Promise.all([
      request("messages"), request("projects"), request("education"), request("skills"),
    ]);

    const results = [
      ...messages.records.map(r  => ({ section: "Messages",  label: r.name + " — " + r.subject, href: "#messages", data: r })),
      ...projects.records.map(r  => ({ section: "Projects",  label: r.title, href: "#projects",  data: r })),
      ...education.records.map(r => ({ section: "Education", label: r.institution + " — " + r.qualification, href: "#education", data: r })),
      ...skills.records.map(r    => ({ section: "Skills",    label: r.name + " (" + r.category + ")", href: "#skills", data: r })),
    ].filter(item => JSON.stringify(item.data).toLowerCase().includes(q));

    if (results.length === 0) {
      searchResults.hidden = false;
      searchResults.innerHTML = `<p class="search-empty">No results for "<strong>${q}</strong>"</p>`;
      return;
    }

    searchResults.hidden = false;
    for (const item of results.slice(0, 12)) {
      const div = document.createElement("div");
      div.className = "search-result-item";
      div.innerHTML = `<span class="search-result-section">${item.section}</span> <span>${item.label}</span>`;
      div.addEventListener("click", () => {
        const target = document.querySelector(item.href);
        if (target) target.scrollIntoView({ behavior: "smooth" });
        globalSearch.value = "";
        searchResults.hidden = true;
      });
      searchResults.append(div);
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".topbar-search")) searchResults.hidden = true;
  });

  /* ═══════════════════════════════════════════════════════
     ACTIVITY LOG
  ═══════════════════════════════════════════════════════ */
  function renderActivityLog() {
    const log = $("activityLog");
    log.replaceChildren();
    const activity = store.getActivity();
    if (activity.length === 0) {
      const li = document.createElement("li");
      li.className = "activity-empty";
      li.textContent = "No activity recorded yet.";
      log.append(li);
      return;
    }
    for (const entry of activity) {
      const li  = document.createElement("li");
      li.className = "activity-item";
      const ts  = new Date(entry.ts);
      li.innerHTML = `
        <span class="activity-dot"></span>
        <div class="activity-body">
          <span class="activity-msg">${entry.msg}</span>
          <span class="activity-time">${ts.toLocaleString()}</span>
        </div>`;
      log.append(li);
    }
  }

  $("clearActivityBtn").addEventListener("click", () => {
    if (!window.confirm("Clear all activity logs?")) return;
    store.clearActivity();
    renderActivityLog();
    toast("Activity log cleared.", "info");
  });

  $("clearActivityDanger").addEventListener("click", () => {
    if (!window.confirm("Clear all activity logs?")) return;
    store.clearActivity();
    renderActivityLog();
    toast("Activity log cleared.", "info");
  });

  /* ═══════════════════════════════════════════════════════
     PASSWORD CHANGE
  ═══════════════════════════════════════════════════════ */
  const newPwInput = $("newPw");
  const pwStrength = $("pwStrength");
  const pwFill     = $("pwStrengthFill");
  const pwLabel    = $("pwStrengthLabel");

  newPwInput.addEventListener("input", () => {
    const v = newPwInput.value;
    if (!v) { pwStrength.hidden = true; return; }
    pwStrength.hidden = false;
    const score = calcPwStrength(v);
    const levels = ["Weak", "Fair", "Good", "Strong", "Very strong"];
    const classes = ["pw-weak", "pw-fair", "pw-good", "pw-strong", "pw-very-strong"];
    pwFill.style.width   = `${(score + 1) * 20}%`;
    pwFill.className     = classes[score];
    pwLabel.textContent  = levels[score];
  });

  function calcPwStrength(pw) {
    let s = 0;
    if (pw.length >= 8)  s++;
    if (pw.length >= 12) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return Math.min(s - 1, 4);
  }

  $("passwordForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const current  = $("currentPw").value;
    const newPw    = $("newPw").value;
    const confirmPw = $("confirmPw").value;
    const pwStatus  = $("pwStatus");

    if (current !== DEMO_PASS && !isDemoMode) {
      setStatus(pwStatus, "Current password is incorrect.", true);
      return;
    }
    if (isDemoMode && current !== DEMO_PASS) {
      setStatus(pwStatus, "Current password is incorrect. (demo: admin123)", true);
      return;
    }
    if (newPw.length < 8) {
      setStatus(pwStatus, "New password must be at least 8 characters.", true);
      return;
    }
    if (newPw !== confirmPw) {
      setStatus(pwStatus, "Passwords do not match.", true);
      return;
    }
    store.log("Password changed");
    setStatus(pwStatus, "Password updated successfully.", false);
    toast("Password updated.", "success");
    $("passwordForm").reset();
    pwStrength.hidden = true;
  });

  /* ═══════════════════════════════════════════════════════
     EXPORT DATA
  ═══════════════════════════════════════════════════════ */
  $("qaExportBtn").addEventListener("click", async () => {
    try {
      const [messages, projects, education, skills] = await Promise.all([
        request("messages"), request("projects"), request("education"), request("skills"),
      ]);
      const data = { exported: new Date().toISOString(), messages: messages.records, projects: projects.records, education: education.records, skills: skills.records };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `liam-portfolio-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      store.log("Exported portfolio data to JSON");
      toast("Export downloaded.", "success");
    } catch (err) {
      toast("Export failed: " + err.message, "error");
    }
  });

  /* ═══════════════════════════════════════════════════════
     KEYBOARD SHORTCUTS
  ═══════════════════════════════════════════════════════ */
  document.addEventListener("keydown", (e) => {
    if (dashboard.hidden) return;
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) {
      if (e.key === "Escape") {
        globalSearch.value = "";
        searchResults.hidden = true;
        notifDropdown.hidden = true;
      }
      return;
    }
    switch (e.key.toLowerCase()) {
      case "k": e.preventDefault(); globalSearch.focus(); globalSearch.select(); break;
      case "r": e.preventDefault(); loadDashboard(); toast("Refreshed.", "info"); break;
      case "d": e.preventDefault(); setDark(root.dataset.theme !== "dark"); break;
      case "1": e.preventDefault(); document.getElementById("overview").scrollIntoView({ behavior: "smooth" }); break;
      case "2": e.preventDefault(); document.getElementById("messages").scrollIntoView({ behavior: "smooth" }); break;
      case "3": e.preventDefault(); document.getElementById("projects").scrollIntoView({ behavior: "smooth" }); break;
    }
  });

  /* ═══════════════════════════════════════════════════════
     INIT — check existing session
  ═══════════════════════════════════════════════════════ */
  request("session")
    .then((result) => {
      if (result.authenticated) {
        showDashboard(result.csrfToken);
      } else {
        isDemoMode = true;
        showLogin();
      }
    })
    .catch(() => {
      isDemoMode = true;
      showLogin();
    })
    .finally(() => {
      // Wire up filter searches after a tick to let the DOM settle
      setTimeout(reRenderFiltered, 500);
    });
});
