/** 总控 SPA 共享运行时 — 各 tab 模块挂载到此对象 */
window.Console = {
  TOKEN_KEY: "master_token",
  currentTab: "dash",
  sessionUser: "admin",
  agentSubView: null,
  resourceSubView: null,
  groupsSubView: null,
  dashRefreshTimer: null,

  $(s) {
    return document.querySelector(s);
  },

  toast(msg) {
    const el = this.$("#toast");
    el.textContent = msg;
    el.style.display = "block";
    setTimeout(() => {
      el.style.display = "none";
    }, 2000);
  },

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY) || "";
  },

  setToken(t) {
    if (t) localStorage.setItem(this.TOKEN_KEY, t);
    else localStorage.removeItem(this.TOKEN_KEY);
  },

  async api(path, opts = {}) {
    const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(path, { ...opts, headers });
    const json = await res.json();
    if (res.status === 401) {
      this.setToken("");
      this.showLogin();
      throw new Error("未登录");
    }
    return json;
  },

  esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  },

  showLogin() {
    this.$("#page-login").classList.remove("hide");
    this.$("#page-app").classList.remove("show");
  },

  showApp() {
    this.$("#page-login").classList.add("hide");
    this.$("#page-app").classList.add("show");
    this.switchTab(this.currentTab);
  },

  switchTab(name) {
    if (name !== "dash") this.stopDashRefresh();
    this.currentTab = name;
    document.querySelectorAll(".tabbar-item, .nav-item").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === name);
    });
    if (name === "dash") this.loadDash();
    else if (name === "agent") {
      this.agentSubView = null;
      this.loadAgent();
    } else if (name === "resource") {
      this.resourceSubView = null;
      this.loadResource();
    } else if (name === "menu") this.loadMenu();
    else if (name === "groups") {
      this.groupsSubView = null;
      this.loadGroups();
    }
  },

  stopDashRefresh() {
    if (this.dashRefreshTimer) {
      clearInterval(this.dashRefreshTimer);
      this.dashRefreshTimer = null;
    }
  },
};
