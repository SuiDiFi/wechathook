const TOKEN_KEY = "agent_token";
const SESSION_KEY = "agent_session";
const $ = (s) => document.querySelector(s);
let currentTab = "dash";
let session = { username: "", uid: 0 };
let groupSubView = null;

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 2000);
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

function syncLegacySession(token, uid) {
  if (token) {
    localStorage.setItem("token", token);
    localStorage.setItem("uid", String(uid ?? ""));
    localStorage.setItem("isAgent", "1");
  } else {
    localStorage.removeItem("token");
    localStorage.removeItem("uid");
    localStorage.removeItem("isAgent");
  }
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveSession(s) {
  session = s;
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const res = await fetch(path, { ...opts, headers });
  const json = await res.json();
  return json;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function showLogin() {
  $("#page-login").classList.remove("hide");
  $("#page-app").classList.remove("show");
}

function showApp() {
  $("#page-login").classList.add("hide");
  $("#page-app").classList.add("show");
  switchTab(currentTab);
}

function switchTab(name) {
  currentTab = name;
  if (name !== "groups") groupSubView = null;
  document.querySelectorAll(".tabbar-item, .nav-item").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === name);
  });
  if (name === "dash") loadDash();
  else if (name === "bots") loadBots();
  else if (name === "groups") loadGroups();
  else if (name === "menu") loadMenu();
  else if (name === "settings") loadSettings();
}

document.querySelectorAll(".tabbar-item, .nav-item").forEach((t) => {
  t.addEventListener("click", () => switchTab(t.dataset.tab));
});

async function handleLogin() {
  const btn = $("#btn-login");
  const errEl = $("#login-err");
  if (!btn || btn.disabled) return;
  errEl.textContent = "";
  const username = $("#inp-user")?.value.trim() ?? "";
  const password = $("#inp-pass")?.value ?? "";
  if (!username || !password) {
    errEl.textContent = "请输入账号和密码";
    return;
  }
  const label = btn.querySelector("span");
  const prevText = label?.textContent ?? "登 录";
  btn.disabled = true;
  if (label) label.textContent = "登录中…";
  try {
    const j = await api("/api/Agent/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (j.status !== 1) {
      errEl.textContent = j.message || "登录失败";
      return;
    }
    saveSession({ username, uid: j.data?.uid ?? 0 });
    const token = j.data?.token || "ok";
    setToken(token);
    syncLegacySession(token, j.data?.uid);
    showApp();
  } catch {
    errEl.textContent = "网络异常，请稍后重试";
  } finally {
    btn.disabled = false;
    if (label) label.textContent = prevText;
  }
}

function bindLoginForm() {
  const btn = $("#btn-login");
  const pass = $("#inp-pass");
  if (btn) btn.addEventListener("click", handleLogin);
  if (pass) {
    pass.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  }
}

bindLoginForm();

function dashHeader() {
  return wxPageHeader("总代中心");
}

function wxSceneHtml() {
  return `<div class="wx-scene" aria-hidden="true">
    <div class="wx-scene__mesh"></div>
    <div class="wx-scene__orb wx-scene__orb--1"></div>
    <div class="wx-scene__orb wx-scene__orb--2"></div>
    <div class="wx-scene__orb wx-scene__orb--3"></div>
    <div class="wx-scene__orb wx-scene__orb--4"></div>
    <div class="wx-scene__wave"></div>
  </div>`;
}

function wxPageHeader(title, opts = {}) {
  const left = opts.back
    ? `<button type="button" class="btn-text left btn-text--wx" data-groups-back><i class="ri-arrow-left-s-line"></i> ${esc(opts.backLabel || "返回")}</button>`
    : `<button type="button" class="btn-text left btn-text--wx" id="btn-logout-hub">退出</button>`;
  return `<div class="page-header page-header--wx">
    <div>${left}</div>
    <h2>${esc(title)}</h2>
    <div><span class="btn-text right"></span></div>
  </div>`;
}

function wxPageBody(content) {
  return `<div class="page-body page-body--wx-page">
    ${wxSceneHtml()}
    <div class="wx-stack">${content}</div>
  </div>`;
}

function wxPage(title, content, opts = {}) {
  return wxPageHeader(title, opts) + wxPageBody(content);
}

function header(title) {
  return wxPageHeader(title);
}

function bindNav() {
  const logout = $("#view-root").querySelector("#btn-logout-hub");
  if (logout) {
    logout.onclick = () => {
      setToken("");
      syncLegacySession("", 0);
      localStorage.removeItem(SESSION_KEY);
      showLogin();
    };
  }
  $("#view-root").querySelectorAll("[data-go]").forEach((el) => {
    el.onclick = () => switchTab(el.dataset.go);
  });
  $("#view-root").querySelectorAll("[data-group-detail]").forEach((el) => {
    el.onclick = () => {
      groupSubView = el.dataset.groupDetail;
      loadGroups();
    };
  });
  $("#view-root").querySelectorAll("[data-groups-back]").forEach((el) => {
    el.onclick = () => {
      groupSubView = null;
      loadGroups();
    };
  });
  $("#view-root").querySelectorAll("[data-bot-toggle]").forEach((el) => {
    el.onclick = () => {
      const item = el.closest(".bot-list-item");
      if (!item) return;
      const open = item.classList.toggle("is-open");
      el.setAttribute("aria-expanded", open ? "true" : "false");
      const detail = item.querySelector(".bot-list-detail");
      if (detail) detail.hidden = !open;
    };
  });
}

function sectionHead(title, sub = "") {
  const subHtml = sub ? `<span class="section-sub">${esc(sub)}</span>` : "";
  return `<div class="section-head"><div class="section-dot accent"></div><div><div class="section-title">${esc(title)}</div>${subHtml}</div></div>`;
}

function statCard(icon, label, value, tone = "") {
  return `<div class="stat-card ${tone ? "tone-" + tone : ""}">
    <div class="stat-card-top"></div>
    <div class="ico ${tone}"><i class="${icon}"></i></div>
    <div class="stat-body">
      <div class="label">${esc(label)}</div>
      <div class="value">${esc(value)}</div>
    </div>
  </div>`;
}

function statusTile(label, value, sub, tone = "") {
  return `<div class="status-tile ${tone}">
    <div class="st-label">${esc(label)}</div>
    <div class="st-value">${esc(value)}</div>
    <div class="st-sub">${esc(sub)}</div>
  </div>`;
}

function shortRoomId(id) {
  const s = String(id ?? "");
  if (s.length <= 22) return s;
  return s.slice(0, 12) + "…" + s.slice(-10);
}

function vantIconClass(name) {
  const alias = {
    qian: "gold-coin-o",
    tgrj: "notes-o",
    "singout-o": "exchange",
  };
  const icon = alias[name] || name || "apps-o";
  return `van-icon van-icon-${icon}`;
}

function normalizeMenuRoute(to) {
  const route = String(to ?? "").trim();
  if (!route || route === "#") return "";
  return route.startsWith("/") ? route : `/${route}`;
}

function menuIconHtml(name) {
  return `<i class="${vantIconClass(name)}" aria-hidden="true"></i>`;
}

async function fetchMember() {
  const j = await api("/api/Member/index", { method: "POST", body: "{}" });
  return j.data || {};
}

async function fetchSetting() {
  const j = await api("/api/Setting/index", { method: "POST", body: "{}" });
  return j.data || {};
}

async function fetchMenus() {
  const j = await api("/api/Agent/menus", { method: "POST", body: "{}" });
  return j.data?.menu || [];
}

function wxStat(label, value, tone = "", icon = "") {
  return `<div class="wx-stat ${tone ? "wx-stat--" + tone : ""}">
    ${icon ? `<div class="wx-stat__ico"><i class="${icon}"></i></div>` : ""}
    <div class="wx-stat__value">${esc(value)}</div>
    <div class="wx-stat__label">${esc(label)}</div>
  </div>`;
}

function wxCell({ icon, iconTone = "green", title, desc, tab, badge, value }) {
  const iconCls = iconTone === "orange" ? "wx-cell__icon wx-cell__icon--orange" : "wx-cell__icon";
  const body = `
    <div class="${iconCls}"><i class="${icon}"></i></div>
    <div class="wx-cell__body">
      <div class="wx-cell__title">${esc(title)}</div>
      ${desc ? `<div class="wx-cell__desc">${esc(desc)}</div>` : ""}
    </div>
    ${badge ? `<span class="wx-cell__badge">${esc(badge)}</span>` : ""}
    ${value ? `<span class="wx-cell__value">${esc(value)}</span>` : ""}
    ${tab ? `<i class="ri-arrow-right-s-line wx-cell__arrow"></i>` : ""}`;
  if (tab) {
    return `<button type="button" class="wx-cell" data-go="${tab}">${body}</button>`;
  }
  return `<div class="wx-cell wx-cell--static">${body}</div>`;
}

async function loadDash() {
  const [member, setting] = await Promise.all([fetchMember(), fetchSetting()]);
  const team = member.team || {};
  const groups = member.groups || [];
  const accounts = member.account || [];
  const notice = (setting.notice || "").trim();
  const validGroups = groups.filter((g) => g.status === 1).length;
  const botOnline = accounts.filter((a) => a.enable).length;
  const displayName = session.username || team.serve_name || "总代账号";
  const uid = String(session.uid || team.id || "-");

  $("#view-root").innerHTML = `
    ${dashHeader()}
    ${wxPageBody(`
      <section class="wx-profile wx-elev wx-elev--hero">
        <div class="wx-profile__avatar"><i class="ri-wechat-fill"></i></div>
        <div class="wx-profile__main">
          <div class="wx-profile__name">${esc(displayName)}</div>
          <div class="wx-profile__meta">UID ${esc(uid)} · ${esc(team.serve_name || "总代服务")}</div>
        </div>
        <div class="wx-profile__badge ${botOnline ? "is-on" : ""}">${botOnline ? "Bot 在线" : "Bot 离线"}</div>
      </section>

      <div class="wx-group wx-elev wx-elev--stats">
        <div class="wx-group__label"><span class="wx-group__dot"></span>数据概览</div>
        <div class="wx-stat-row">
          ${wxStat("微信账号", accounts.length, "green", "ri-wechat-line")}
          ${wxStat("管理群", groups.length, "green", "ri-group-line")}
          ${wxStat("配额", team.quota_num ?? 0, "green", "ri-coin-line")}
          ${wxStat("授权有效", validGroups, "green", "ri-shield-check-line")}
        </div>
      </div>

      ${notice ? `<div class="wx-group wx-elev wx-elev--notice wx-notice">
        <div class="wx-notice__head"><i class="ri-volume-up-line"></i> 平台公告</div>
        <div class="wx-notice__body">${esc(notice)}</div>
      </div>` : ""}

      <div class="wx-group wx-elev wx-elev--menu">
        <div class="wx-group__label"><span class="wx-group__dot"></span>常用功能</div>
        ${wxCell({ icon: "ri-wechat-line", title: "微信账号", desc: "查看 Bot 登录状态", tab: "bots", badge: accounts.length ? String(accounts.length) : "" })}
        ${wxCell({ icon: "ri-group-line", title: "群组管理", desc: "授权群列表与详情", tab: "groups", badge: groups.length ? String(groups.length) : "" })}
        ${wxCell({ icon: "ri-apps-line", title: "功能配置", desc: "插件与群功能入口", tab: "menu" })}
        ${wxCell({ icon: "ri-settings-3-line", title: "个人设置", desc: "服务名、Bot 与公告", tab: "settings" })}
      </div>

      <div class="wx-group wx-elev wx-elev--status">
        <div class="wx-group__label"><span class="wx-group__dot"></span>运行状态</div>
        ${wxCell({ icon: "ri-server-line", title: "服务名", value: team.serve_name || "-" })}
        ${wxCell({ icon: "ri-robot-2-line", title: "机器说明", value: (team.robot_content || "-").slice(0, 18) + ((team.robot_content || "").length > 18 ? "…" : "") })}
        ${wxCell({ icon: "ri-shield-check-line", title: "群授权", value: `${validGroups} / ${groups.length}`, iconTone: "green" })}
      </div>
    `)}`;
  bindNav();
}

function modBtn(icon, title, desc, tab, tone) {
  const icoCls = tone === "green" ? "ico green" : "ico";
  const cardCls = `mod-card mod-card--${tone}`;
  return `<button type="button" class="${cardCls}" data-go="${tab}">
    <div class="${icoCls}"><i class="${icon}"></i></div>
    <div class="mod-text"><div class="title">${esc(title)}</div><div class="desc">${esc(desc)}</div></div>
    <span class="mod-arrow"><i class="ri-arrow-right-s-line"></i></span>
  </button>`;
}

async function loadBots() {
  const member = await fetchMember();
  const accounts = member.account || [];
  let list = "";
  if (!accounts.length) {
    list = `<div class="group-empty">
      <div class="group-empty__ico"><i class="ri-wechat-line"></i></div>
      <div class="group-empty__title">暂无微信账号</div>
      <div class="group-empty__desc">请在 bot.yaml 配置 botWxid</div>
    </div>`;
  } else {
    const head = `<div class="agent-cred-head"><span>昵称</span><span>wxid</span><span>状态</span><span></span></div>`;
    const body = accounts.map((a) => `<div class="agent-cred-row">
      <span class="agent-cred-name">${esc(a.nickname || "Bot")}</span>
      <span class="agent-cred-uid mono">${esc(a.wxid)}</span>
      <span class="agent-cred-status ${a.enable ? "ok" : "off"}">${a.enable ? "在线" : "离线"}</span>
      <span></span>
    </div>`).join("");
    list = `<div class="agent-cred-list">${head}${body}</div>`;
  }
  $("#view-root").innerHTML = wxPage("微信账号", `
    <div class="wx-group wx-elev wx-elev--panel">
      <div class="wx-group__label"><span class="wx-group__dot"></span>账号列表${accounts.length ? ` · 共 ${accounts.length} 个` : " · 暂无"}</div>
      ${list}
    </div>`);
  bindNav();
}

async function loadGroups() {
  if (groupSubView) return renderGroupDetail(groupSubView);
  const member = await fetchMember();
  const groups = member.groups || [];
  let list = "";
  if (!groups.length) {
    list = `<div class="group-empty">
      <div class="group-empty__ico"><i class="ri-group-line"></i></div>
      <div class="group-empty__title">暂无群组</div>
      <div class="group-empty__desc">在 config/groups/ 添加群配置</div>
    </div>`;
  } else {
    const head = `<div class="agent-cred-head group-cred-head"><span>群 ID</span><span>到期</span><span>授权</span><span></span></div>`;
    const body = groups.map((g) => `<button type="button" class="agent-cred-row group-cred-row" data-group-detail="${esc(g.group_id)}">
      <span class="group-row-id" title="${esc(g.group_id)}">${esc(shortRoomId(g.group_id))}</span>
      <span class="group-row-agent">${esc(g.expires_time || "—")}</span>
      <span class="agent-cred-status ${g.status === 1 ? "ok" : "bad"}">${g.status === 1 ? "有效" : "过期"}</span>
      <i class="ri-arrow-right-s-line agent-cred-arrow"></i>
    </button>`).join("");
    list = `<div class="agent-cred-list">${head}${body}</div>`;
  }
  $("#view-root").innerHTML = wxPage("群组", `
    <div class="wx-group wx-elev wx-elev--panel">
      <div class="wx-group__label"><span class="wx-group__dot"></span>群列表${groups.length ? ` · 共 ${groups.length} 个群` : " · 暂无"}</div>
      ${list}
    </div>`);
  bindNav();
}

async function renderGroupDetail(roomId) {
  const member = await fetchMember();
  const g = (member.groups || []).find((x) => x.group_id === roomId);
  if (!g) {
    groupSubView = null;
    return loadGroups();
  }
  $("#view-root").innerHTML = wxPage("群详情", `
    <div class="wx-group wx-elev wx-elev--panel wx-elev--detail">
      <div class="wx-group__label"><span class="wx-group__dot"></span>${esc(shortRoomId(g.group_id))}</div>
      ${wxCell({ icon: "ri-hashtag", title: "群 ID", value: g.group_id })}
      ${wxCell({ icon: "ri-team-line", title: "群名称", value: g.group_name || "-" })}
      ${wxCell({ icon: "ri-calendar-line", title: "授权到期", value: g.expires_time || "未设置" })}
      ${wxCell({ icon: "ri-shield-check-line", title: "状态", value: g.status === 1 ? "授权有效" : "已过期" })}
    </div>`, { back: true });
  bindNav();
}

async function loadMenu() {
  const sections = await fetchMenus();
  let html = "";
  for (const sec of sections) {
    let cards = "";
    for (const item of sec.list || []) {
      const route = normalizeMenuRoute(item.to);
      if (!route) continue;
      cards += `<a class="wx-menu-card" href="${esc(route)}">
        <div class="wx-menu-card__ico">${menuIconHtml(item.icon)}</div>
        <div class="wx-menu-card__title">${esc(item.title || "")}</div>
      </a>`;
    }
    if (!cards) continue;
    html += `<div class="wx-group wx-elev wx-elev--menu">
      <div class="wx-group__label"><span class="wx-group__dot"></span>${esc(sec.title || "功能")} <span class="wx-group__count">${(sec.list || []).length}</span></div>
      <div class="wx-menu-grid">${cards}</div>
    </div>`;
  }
  if (!html) {
    html = `<div class="wx-group wx-elev wx-elev--panel"><div class="group-empty"><div class="group-empty__title">暂无功能菜单</div></div></div>`;
  }
  $("#view-root").innerHTML = wxPage("功能配置", html);
  bindNav();
}

function renderBotList(accounts, team) {
  if (!accounts.length) {
    return `<div class="group-empty group-empty--compact">
      <div class="group-empty__ico"><i class="ri-robot-2-line"></i></div>
      <div class="group-empty__title">暂无 Bot</div>
      <div class="group-empty__desc">请在 bot.yaml 配置 botWxid</div>
    </div>`;
  }
  const robotDesc = team.robot_content || "-";
  return `<div class="bot-list">${accounts.map((a, i) => {
    const online = Boolean(a.enable);
    return `<div class="bot-list-item">
      <button type="button" class="bot-list-head" data-bot-toggle aria-expanded="false" aria-controls="bot-detail-${i}">
        <div class="bot-list-avatar"><i class="ri-wechat-line"></i></div>
        <div class="bot-list-summary">
          <div class="bot-list-name">${esc(a.nickname || "Bot")}</div>
          <div class="bot-list-wxid mono">${esc(a.wxid || "-")}</div>
        </div>
        <span class="agent-cred-status ${online ? "ok" : "off"}">${online ? "在线" : "离线"}</span>
        <i class="ri-arrow-down-s-line bot-list-chevron" aria-hidden="true"></i>
      </button>
      <div class="bot-list-detail" id="bot-detail-${i}" hidden>
        <div class="cell"><div class="cell-title">微信号</div><div class="cell-value mono">${esc(a.wxid || "-")}</div></div>
        <div class="cell"><div class="cell-title">昵称</div><div class="cell-value">${esc(a.nickname || "-")}</div></div>
        <div class="cell"><div class="cell-title">状态</div><div class="cell-value ${online ? "ok" : "bad"}">${online ? "在线" : "离线"}</div></div>
        <div class="cell"><div class="cell-title">最近登录</div><div class="cell-value">${esc(a.login_time || "-")}</div></div>
        <div class="cell"><div class="cell-title">机器描述</div><div class="cell-value">${esc(robotDesc)}</div></div>
        <div class="cell"><div class="cell-title">今日 / 昨日消息</div><div class="cell-value">${esc(String(a.today ?? 0))} / ${esc(String(a.yesterday ?? 0))}</div></div>
      </div>
    </div>`;
  }).join("")}</div>`;
}

async function loadSettings() {
  const [member, setting] = await Promise.all([fetchMember(), fetchSetting()]);
  const team = member.team || {};
  const accounts = member.account || [];
  $("#view-root").innerHTML = wxPage("设置", `
    <div class="wx-group wx-elev wx-elev--panel">
      <div class="wx-group__label"><span class="wx-group__dot"></span>总代信息</div>
      ${wxCell({ icon: "ri-user-line", title: "登录账号", value: session.username || team.serve_name || "-" })}
      ${wxCell({ icon: "ri-fingerprint-line", title: "UID", value: String(session.uid || team.id || "-") })}
      ${wxCell({ icon: "ri-server-line", title: "服务名", value: team.serve_name || "-" })}
      ${wxCell({ icon: "ri-coin-line", title: "配额", value: String(team.quota_num ?? "-") })}
    </div>
    <div class="wx-group wx-elev wx-elev--panel">
      <div class="wx-group__label"><span class="wx-group__dot"></span>Bot列表${accounts.length ? `<span class="wx-group__count">${accounts.length}</span>` : ""}</div>
      ${renderBotList(accounts, team)}
    </div>
    <div class="wx-group wx-elev wx-elev--notice">
      <div class="wx-notice__head"><i class="ri-megaphone-line"></i> 平台公告</div>
      <div class="wx-notice__body">${esc(setting.notice || "暂无公告")}</div>
    </div>`);
  bindNav();
}

async function loadLoginNotice() {
  try {
    const j = await api("/api/Setting/index", { method: "POST", body: "{}" });
    const notice = String(j.data?.notice ?? "").trim();
    if (!notice) return;
    const box = $("#login-notice");
    const body = $("#login-notice-body");
    if (box && body) {
      body.textContent = notice;
      box.style.display = "block";
    }
  } catch (_) {
    /* 未登录也可拉公告 */
  }
}

(async function init() {
  session = loadSession();
  if (getToken() && session.username) {
    syncLegacySession(getToken(), session.uid);
  }
  await loadLoginNotice();
  if (getToken() && session.username) {
    showApp();
    return;
  }
  showLogin();
})();
