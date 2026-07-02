const TOKEN_KEY = "master_token";
const $ = (s) => document.querySelector(s);
let currentTab = "dash";
let sessionUser = "admin";
let agentSubView = null;
let resourceSubView = null;
let groupsSubView = null;

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

async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });
  const json = await res.json();
  if (res.status === 401) {
    setToken("");
    showLogin();
    throw new Error("未登录");
  }
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
  if (name !== "dash") stopDashRefresh();
  currentTab = name;
  document.querySelectorAll(".tabbar-item, .nav-item").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === name);
  });
  if (name === "dash") loadDash();
  else if (name === "agent") { agentSubView = null; loadAgent(); }
  else if (name === "resource") { resourceSubView = null; loadResource(); }
  else if (name === "menu") loadMenu();
  else if (name === "groups") { groupsSubView = null; loadGroups(); }
}

document.querySelectorAll(".tabbar-item, .nav-item").forEach((t) => {
  t.addEventListener("click", () => switchTab(t.dataset.tab));
});

$("#btn-login").onclick = async () => {
  $("#login-err").textContent = "";
  const username = $("#inp-user").value.trim();
  const password = $("#inp-pass").value;
  const j = await api("/api/master/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (j.status !== 1) {
    $("#login-err").textContent = j.message || "登录失败";
    return;
  }
  sessionUser = j.data.username || username;
  setToken(j.data.token);
  showApp();
};

$("#inp-pass").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#btn-login").click();
});

function header(title, opts = {}) {
  let back;
  if (opts.groupsBack) {
    back = `<button type="button" class="btn-text left" data-groups-back><i class="ri-arrow-left-s-line"></i> 返回</button>`;
  } else if (opts.resourceBack) {
    back = `<button type="button" class="btn-text left" data-resource-back><i class="ri-arrow-left-s-line"></i> 返回</button>`;
  } else if (opts.agentBack) {
    back = `<button type="button" class="btn-text left" data-agent-back><i class="ri-arrow-left-s-line"></i> 返回</button>`;
  } else if (opts.back) {
    back = `<button type="button" class="btn-text left" data-go="dash"><i class="ri-arrow-left-s-line"></i> 返回</button>`;
  } else {
    back = `<button type="button" class="btn-text left" id="btn-logout-hub"><i class="ri-logout-box-r-line"></i> 退出</button>`;
  }
  const right = opts.right || `<span class="btn-text right"></span>`;
  return `<div class="page-header"><div>${back}</div><h2>${esc(title)}</h2><div>${right}</div></div>`;
}

function bindNav() {
  $("#view-root").querySelectorAll("[data-go]").forEach((el) => {
    el.onclick = () => switchTab(el.dataset.go);
  });
  $("#view-root").querySelectorAll("[data-agent-sub]").forEach((el) => {
    el.onclick = () => {
      agentSubView = el.dataset.agentSub;
      loadAgent();
    };
  });
  $("#view-root").querySelectorAll("[data-agent-back]").forEach((el) => {
    el.onclick = () => {
      agentSubView = null;
      loadAgent();
    };
  });
  $("#view-root").querySelectorAll("[data-resource-detail]").forEach((el) => {
    el.onclick = () => {
      resourceSubView = el.dataset.resourceDetail;
      loadResource();
    };
  });
  $("#view-root").querySelectorAll("[data-resource-back]").forEach((el) => {
    el.onclick = () => {
      resourceSubView = null;
      loadResource();
    };
  });
  $("#view-root").querySelectorAll("[data-group-detail]").forEach((el) => {
    el.onclick = () => {
      groupsSubView = el.dataset.groupDetail;
      loadGroups();
    };
  });
  $("#view-root").querySelectorAll("[data-groups-back]").forEach((el) => {
    el.onclick = () => {
      groupsSubView = null;
      loadGroups();
    };
  });
  const logout = $("#view-root").querySelector("#btn-logout-hub");
  if (logout) {
    logout.onclick = async () => {
      try { await api("/api/master/logout", { method: "POST", body: "{}" }); } catch (_) {}
      setToken("");
      showLogin();
    };
  }
}

function shortUrl(url) {
  try {
    return new URL(url).host;
  } catch {
    return String(url ?? "").replace(/^https?:\/\//, "").slice(0, 40);
  }
}

function statusTile(label, value, sub, tone = "") {
  return `<div class="status-tile ${tone}">
    <div class="st-label">${esc(label)}</div>
    <div class="st-value">${esc(value)}</div>
    <div class="st-sub">${esc(sub)}</div>
  </div>`;
}

function sectionHead(title, sub = "") {
  const subHtml = sub ? `<span class="section-sub">${esc(sub)}</span>` : "";
  return `<div class="section-head"><div class="section-dot"></div><div><div class="section-title">${esc(title)}</div>${subHtml}</div></div>`;
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

function modCard(icon, title, desc, action, ext = false, tone = "") {
  const icoCls = ext ? "ico ext" : tone === "green" ? "ico green" : "ico";
  const cardCls = `mod-card${ext ? " mod-card--ext" : ""}${tone && !ext ? " mod-card--" + tone : ""}`;
  const arrow = ext
    ? `<span class="mod-arrow ext"><i class="ri-external-link-line"></i></span>`
    : `<span class="mod-arrow"><i class="ri-arrow-right-s-line"></i></span>`;
  const inner = `<div class="${icoCls}"><i class="${icon}"></i></div>
    <div class="mod-text"><div class="title">${esc(title)}</div><div class="desc">${esc(desc)}</div></div>
    ${arrow}`;
  if (action.startsWith("http") || action.startsWith("/")) {
    return `<a class="${cardCls}" href="${action}" target="_blank" rel="noopener">${inner}</a>`;
  }
  return `<button type="button" class="${cardCls}" data-go="${action}">${inner}</button>`;
}

let dashRefreshTimer = null;

function stopDashRefresh() {
  if (dashRefreshTimer) {
    clearInterval(dashRefreshTimer);
    dashRefreshTimer = null;
  }
}

/** 兼容旧版 dashboard 字段，并统一概览统计口径 */
function normalizeDashStats(raw) {
  const d = raw || {};
  const groupTotal = d.managedGroupCount ?? d.groupCount ?? 0;
  const botTotal = d.botTotalCount ?? (d.botServerOk ? Math.max(groupTotal > 0 ? 1 : 0, d.agentLogin ? 1 : 0) : 0);
  return {
    ...d,
    groupValidCount: d.groupValidCount ?? groupTotal,
    agentCount: d.agentCount ?? (d.agentLogin ? 1 : 0),
    managedGroupCount: groupTotal,
    botOnlineCount: d.botOnlineCount ?? (d.botServerOk ? botTotal : 0),
    botTotalCount: botTotal,
    groupCount: d.groupCount ?? groupTotal,
    groupExpiringSoonCount: d.groupExpiringSoonCount ?? 0,
  };
}

async function loadDash() {
  stopDashRefresh();
  const j = await api("/api/master/dashboard");
  if (j.status !== 1) {
    toast(j.message || "加载概览失败");
    return;
  }
  const d = normalizeDashStats(j.data);
  $("#view-root").innerHTML = `
    ${header("官方总控")}
    <div class="page-body page-body--grid">
      <div class="info-banner span-full">
        <div class="info-avatar"><i class="ri-admin-line"></i></div>
        <div class="info-content">
          <div class="label">当前管理员</div>
          <div class="value">${esc(sessionUser)}</div>
          <div class="info-meta">
            <span class="info-chip ${d.agentEnabled ? "ok" : "off"}">${d.agentEnabled ? "总代已开启" : "总代已关闭"}</span>
          </div>
        </div>
        <div class="info-badge ${(d.botOnlineCount ?? 0) > 0 ? "ok" : "bad"}">BOT 在线 ${d.botOnlineCount ?? 0}</div>
      </div>
      <section class="section span-full">
        ${sectionHead("数据概览", "实时统计")}
        <div class="stat-grid">
          ${statCard("ri-group-line", "授权群", d.groupValidCount ?? 0)}
          ${statCard("ri-user-star-line", "代理数量", d.agentCount ?? 0, "accent")}
          ${statCard("ri-team-line", "管理群", d.managedGroupCount ?? 0)}
          ${statCard("ri-robot-line", "BOT 在线数", d.botOnlineCount ?? 0, (d.botOnlineCount ?? 0) > 0 ? "ok" : "bad")}
        </div>
      </section>
      <section class="section span-full">
        ${sectionHead("功能模块", "点击进入管理")}
        <div class="mod-grid">
          ${modCard("ri-user-settings-line", "总代设置", "开关、凭据、公告", "agent", false, "orange")}
          ${modCard("ri-database-2-line", "资源总览", "Bot、配置、总代信息", "resource", false, "green")}
          ${modCard("ri-menu-line", "菜单管控", "显示/隐藏总代菜单", "menu", false, "orange")}
          ${modCard("ri-shield-check-line", "群授权", "config/groups 群列表", "groups", false, "green")}
          ${modCard("ri-external-link-line", "预览总代", "打开 /agent/ 个人后台", "/agent/", true)}
        </div>
      </section>
      <div class="card card--status span-full">
        <div class="card-title"><i class="ri-radar-line"></i> 服务监控</div>
        <div class="status-tiles">
          ${statusTile(
            "bot-server",
            d.botServerOk ? "正常" : "不可用",
            shortUrl(d.botServer),
            d.botServerOk ? "ok" : "bad"
          )}
          ${statusTile(
            "群授权",
            `${d.groupValidCount ?? 0} / ${d.groupCount ?? 0}`,
            "有效 / 已配置",
            (d.groupValidCount ?? 0) > 0 ? "ok" : "warn"
          )}
          ${statusTile(
            "即将过期",
            (d.groupExpiringSoonCount ?? 0) > 0 ? `${d.groupExpiringSoonCount} 个群` : "无",
            "30 天内到期",
            (d.groupExpiringSoonCount ?? 0) > 0 ? "warn" : "ok"
          )}
        </div>
      </div>
    </div>`;
  bindNav();
  dashRefreshTimer = setInterval(() => {
    if (currentTab === "dash") loadDash();
  }, 15000);
}

function agentModCard(icon, title, chips, sub, tone = "orange") {
  const chipsHtml = (chips || [])
    .filter(Boolean)
    .map((c) => `<span class="agent-mod-chip">${esc(c)}</span>`)
    .join("");
  return `<button type="button" class="mod-card mod-card--agent mod-card--${tone}" data-agent-sub="${sub}">
    <div class="agent-mod-head">
      <div class="ico ${tone === "green" ? "green" : ""}"><i class="${icon}"></i></div>
      <div class="agent-mod-title">${esc(title)}</div>
      <span class="mod-arrow"><i class="ri-arrow-right-s-line"></i></span>
    </div>
    <div class="agent-mod-chips">${chipsHtml}</div>
  </button>`;
}

function agentCredList(agents) {
  const rows = agents || [];
  const head = `<div class="agent-cred-head">
    <span>账号</span><span>UID</span><span>状态</span><span></span>
  </div>`;
  const body = rows
    .map(
      (r) => `<button type="button" class="agent-cred-row" data-agent-sub="login">
      <span class="agent-cred-name">${esc(r.login?.username || "-")}</span>
      <span class="agent-cred-uid">${esc(String(r.login?.uid ?? "-"))}</span>
      <span class="agent-cred-status ${r.enabled ? "ok" : "off"}">${r.enabled ? "正常" : "已禁用"}</span>
      <i class="ri-arrow-right-s-line agent-cred-arrow"></i>
    </button>`
    )
    .join("");
  return `<div class="agent-cred-list">${head}${body}</div>`;
}

function agentToggleList(agents) {
  const head = `<div class="agent-cred-head agent-cred-head--toggle">
    <span>账号</span><span>UID</span><span>允许登录</span>
  </div>`;
  const body = (agents || [])
    .map(
      (a) => `<div class="agent-cred-row agent-cred-row--toggle">
      <span class="agent-cred-name">${esc(a.login?.username || "-")}</span>
      <span class="agent-cred-uid">${esc(String(a.login?.uid ?? "-"))}</span>
      <div class="switch ${a.enabled ? "on" : ""}" data-agent-toggle="${esc(String(a.login?.uid ?? ""))}" role="switch" aria-checked="${a.enabled ? "true" : "false"}"></div>
    </div>`
    )
    .join("");
  return `<div class="agent-cred-list">${head}${body}</div>`;
}

function policyAgents(policy) {
  if (policy?.agents?.length) return policy.agents;
  const a = policy?.agent || {};
  return [{
    enabled: Boolean(a.enabled),
    login: {
      username: a.login?.username || "",
      password: a.login?.password || "",
      uid: a.login?.uid ?? 0,
    },
    display: {
      serveName: a.display?.serveName || "",
      robotContent: a.display?.robotContent || "",
      quotaNum: a.display?.quotaNum ?? 0,
    },
  }];
}

function agentToggleSummary(agents) {
  const list = agents || [];
  const on = list.filter((a) => a.enabled).length;
  if (!list.length) return "暂无总代";
  if (on === list.length) return `${list.length} 个总代 · 全部开启`;
  if (on === 0) return `${list.length} 个总代 · 全部关闭`;
  return `${on}/${list.length} 已开启`;
}

function agentResourceList(agents) {
  const head = `<div class="agent-cred-head agent-cred-head--uid">
    <span>代理 UID</span><span>状态</span><span></span>
  </div>`;
  const body = (agents || [])
    .map(
      (a) => `<button type="button" class="agent-cred-row agent-cred-row--uid" data-resource-detail="${esc(String(a.uid))}">
      <span class="agent-cred-name uid">${esc(String(a.uid))}</span>
      <span class="agent-cred-status ${a.enabled ? "ok" : "off"}">${a.enabled ? "正常" : "已关闭"}</span>
      <i class="ri-arrow-right-s-line agent-cred-arrow"></i>
    </button>`
    )
    .join("");
  return `<div class="agent-cred-list">${head}${body}</div>`;
}

async function fetchPolicy() {
  const j = await api("/api/master/policy");
  return j.data;
}

async function savePolicy(policy, msg = "已保存") {
  await api("/api/master/policy", { method: "PUT", body: JSON.stringify(policy) });
  toast(msg);
}

function announcePreview(text) {
  const t = String(text ?? "").trim();
  if (!t) return "未设置";
  return t.length > 24 ? t.slice(0, 24) + "…" : t;
}

function fmtLicense(ts) {
  if (!ts) return { text: "未设置", status: "warn", sub: "待设", daysLeft: null };
  const d = new Date(ts * 1000);
  const now = Date.now();
  const days = Math.ceil((d.getTime() - now) / 86400000);
  if (d.getTime() < now) return { text: d.toLocaleDateString(), status: "bad", sub: "已过期", daysLeft: 0 };
  if (days <= 30) return { text: d.toLocaleDateString(), status: "warn", sub: `${days} 天后到期`, daysLeft: days };
  return { text: d.toLocaleDateString(), status: "ok", sub: "授权有效", daysLeft: days };
}

function shortRoomId(id) {
  const s = String(id ?? "");
  if (s.length <= 22) return s;
  return s.slice(0, 12) + "…" + s.slice(-10);
}

function groupStats(groups) {
  let signOn = 0;
  let valid = 0;
  const now = Date.now();
  for (const g of groups) {
    if (g.config?.sign?.enabled) signOn += 1;
    const exp = g.config?.licenseExpires;
    if (exp && exp * 1000 > now) valid += 1;
  }
  return { total: groups.length, signOn, valid };
}

function agentAgentLabel(agent) {
  const u = agent?.login?.username || "-";
  const uid = agent?.login?.uid ?? "-";
  return `${u} · UID ${uid}`;
}

function groupCompactList(groups, agent) {
  const agentLabel = agentAgentLabel(agent);
  const head = `<div class="agent-cred-head group-cred-head">
    <span>群 ID</span><span>归属总代</span><span>授权</span><span></span>
  </div>`;
  const body = (groups || [])
    .map((g) => {
      const lic = fmtLicense(g.config?.licenseExpires);
      return `<button type="button" class="agent-cred-row group-cred-row" data-group-detail="${esc(g.roomId)}">
        <span class="group-row-id" title="${esc(g.roomId)}">${esc(shortRoomId(g.roomId))}</span>
        <span class="group-row-agent">${esc(agentLabel)}</span>
        <span class="agent-cred-status ${lic.status}">${esc(lic.sub || "待设")}</span>
        <i class="ri-arrow-right-s-line agent-cred-arrow"></i>
      </button>`;
    })
    .join("");
  return `<div class="agent-cred-list">${head}${body}</div>`;
}

async function loadAgent() {
  if (!agentSubView) return renderAgentHub();
  if (agentSubView === "toggle") return renderAgentToggle();
  if (agentSubView === "login") return renderAgentLogin();
  if (agentSubView === "announce") return renderAgentAnnounce();
}

async function renderAgentHub() {
  const policy = await fetchPolicy();
  const agents = policyAgents(policy);
  $("#view-root").innerHTML = `
    ${header("总代设置", { back: true })}
    <div class="page-body page-body--agent">
      <section class="section section--agent">
        ${sectionHead("设置模块", "总代开关与公告")}
        <div class="mod-grid agent-mod-grid agent-mod-grid--duo">
          ${agentModCard("ri-list-check", "总代列表", [agentToggleSummary(agents)], "toggle", "orange")}
          ${agentModCard("ri-megaphone-line", "公告", [announcePreview(policy?.announcement)], "announce", "green")}
        </div>
      </section>
      <section class="section">
        ${sectionHead("登录凭据", "点击行编辑账号与密码")}
        ${agentCredList(agents)}
      </section>
      <a class="btn-outline" href="/agent/" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> 打开总代后台验证</a>
    </div>`;
  bindNav();
}

async function renderAgentToggle() {
  const policy = await fetchPolicy();
  const agents = policyAgents(policy);
  $("#view-root").innerHTML = `
    ${header("总代列表", { agentBack: true })}
    <div class="page-body page-body--narrow">
      <div class="detail-tip">控制各总代个人后台 /agent/ 是否允许登录，可单独开关。</div>
      ${agentToggleList(agents)}
    </div>`;
  bindNav();
  $("#view-root").querySelectorAll("[data-agent-toggle]").forEach((sw) => {
    sw.onclick = async () => {
      const uid = Number(sw.dataset.agentToggle);
      const enabled = !sw.classList.contains("on");
      sw.classList.toggle("on", enabled);
      sw.setAttribute("aria-checked", enabled ? "true" : "false");
      try {
        await api("/api/master/agent/toggle", { method: "POST", body: JSON.stringify({ uid, enabled }) });
        toast(enabled ? "已允许该总代登录" : "已禁止该总代登录");
      } catch (e) {
        sw.classList.toggle("on", !enabled);
        sw.setAttribute("aria-checked", !enabled ? "true" : "false");
        toast(e.message || "保存失败");
      }
    };
  });
}

function bindPasswordToggles(root = document) {
  root.querySelectorAll(".btn-password-toggle").forEach((btn) => {
    btn.onclick = () => {
      const input = root.querySelector(`#${btn.dataset.target}`);
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      const icon = btn.querySelector("i");
      if (icon) icon.className = show ? "ri-eye-off-line" : "ri-eye-line";
      btn.setAttribute("aria-label", show ? "隐藏密码" : "显示密码");
    };
  });
}

async function renderAgentLogin() {
  const policy = await fetchPolicy();
  const p = policy?.agent || {};
  $("#view-root").innerHTML = `
    ${header("登录凭据", { agentBack: true })}
    <div class="page-body page-body--narrow">
      <div class="detail-tip">总代登录 /agent/ 时使用的账号信息。</div>
      <div class="card">
        <div class="field"><label>账号</label><input id="login-user" value="${esc(p.login?.username)}" placeholder="总代登录账号" /></div>
        <div class="field field--password">
          <label>密码</label>
          <div class="field-input-wrap">
            <input id="login-pass" type="password" value="${esc(p.login?.password)}" placeholder="总代登录密码" />
            <button type="button" class="btn-password-toggle" data-target="login-pass" aria-label="显示密码"><i class="ri-eye-line"></i></button>
          </div>
        </div>
        <div class="field"><label>UID</label><input id="login-uid" type="number" value="${p.login?.uid || 1000}" min="1000" /></div>
      </div>
      <button class="btn-block" id="save-login">保存</button>
    </div>`;
  bindNav();
  bindPasswordToggles($("#view-root"));
  $("#save-login").onclick = async () => {
    policy.agent.login.username = $("#login-user").value.trim();
    policy.agent.login.password = $("#login-pass").value;
    policy.agent.login.uid = Number($("#login-uid").value);
    policy.agent.display.serveName = policy.agent.login.username;
    const agents = policyAgents(policy);
    if (agents[0]) {
      agents[0].login = { ...policy.agent.login };
      agents[0].display = { ...agents[0].display, serveName: policy.agent.login.username };
      policy.agents = agents;
    }
    await savePolicy(policy, "登录凭据已保存");
    agentSubView = null;
    loadAgent();
  };
}

async function renderAgentAnnounce() {
  const policy = await fetchPolicy();
  $("#view-root").innerHTML = `
    ${header("公告", { agentBack: true })}
    <div class="page-body page-body--narrow">
      <div class="detail-tip">展示在总代个人后台首页的公告内容，留空则不显示。</div>
      <div class="card">
        <div class="field"><label>公告内容</label><textarea id="announce" rows="6" placeholder="输入公告文字…">${esc(policy?.announcement || "")}</textarea></div>
      </div>
      <button class="btn-block" id="save-announce">保存</button>
    </div>`;
  bindNav();
  $("#save-announce").onclick = async () => {
    policy.announcement = $("#announce").value;
    await savePolicy(policy, "公告已保存");
    agentSubView = null;
    loadAgent();
  };
}

async function loadResource() {
  if (!resourceSubView) return renderResourceHub();
  return renderResourceDetail(resourceSubView);
}

async function renderResourceHub() {
  const j = await api("/api/master/resources");
  const d = j.data || {};
  const a = d.agent || {};
  let overrides = "";
  if (!(d.overrides || []).length) {
    overrides = `<div class="cell"><div class="cell-title">暂无</div><div class="cell-value">总代保存后出现</div></div>`;
  } else {
    for (const o of d.overrides) {
      overrides += `<div class="cell">
        <div class="cell-main"><div class="cell-title">${esc(o.op)}</div><div class="cell-label">${esc(o.updated?.slice(0, 19) || "")}</div></div>
        <a href="/agent-src-${esc(o.op)}" target="_blank" rel="noopener" style="color:var(--primary);font-size:13px;text-decoration:none"><i class="ri-eye-line"></i></a>
      </div>`;
    }
  }
  const agents = (d.agents || []).length
    ? d.agents
    : [{ uid: a.login?.uid ?? "-", enabled: a.enabled, login: a.login }];
  const enabledCount = agents.filter((x) => x.enabled).length;
  const agentRows = agents.map((x) => ({
    uid: x.login?.uid ?? x.uid ?? "-",
    enabled: x.enabled,
  }));
  $("#view-root").innerHTML = `
    ${header("资源总览", { back: true })}
    <div class="page-body">
      <section class="section">
        ${sectionHead("数据概览")}
        <div class="stat-grid">
          ${statCard("ri-user-line", "总代状态", `${enabledCount}/${agents.length} 开启`, enabledCount ? "ok" : "bad")}
          ${statCard("ri-eye-off-line", "隐藏菜单", a.hiddenMenuCount ?? 0, "accent")}
          ${statCard("ri-folder-line", "配置数", (d.overrides || []).length)}
          ${statCard("ri-team-line", "管理群", d.stats?.groupCount ?? 0)}
        </div>
      </section>
      <section class="section">
        ${sectionHead("总代理", "点击 UID 查看详情与 BOT 资源")}
        ${agentResourceList(agentRows)}
      </section>
      <div class="card">
        <div class="card-title"><i class="ri-file-list-3-line"></i> 已保存配置</div>
        ${overrides}
      </div>
    </div>`;
  bindNav();
}

async function renderResourceDetail(uid) {
  const j = await api("/api/master/resources");
  const d = j.data || {};
  const agents = (d.agents || []).length ? d.agents : [d.agent].filter(Boolean);
  const a = agents.find((x) => String(x.login?.uid ?? x.uid ?? "") === String(uid));
  const b = d.bot || {};
  if (!a) {
    resourceSubView = null;
    return renderResourceHub();
  }
  $("#view-root").innerHTML = `
    ${header(`总代 UID ${esc(uid)}`, { resourceBack: true })}
    <div class="page-body page-body--narrow">
      <div class="detail-tip">该总代个人后台关联的账号信息与 BOT 资源。</div>
      <div class="card">
        <div class="card-title"><i class="ri-user-star-line"></i> 总代信息</div>
        <div class="cell"><div class="cell-title">登录账号</div><div class="cell-value">${esc(a.login?.username || "-")}</div></div>
        <div class="cell"><div class="cell-title">UID</div><div class="cell-value">${a.login?.uid ?? "-"}</div></div>
        <div class="cell"><div class="cell-title">服务名</div><div class="cell-value">${esc(a.display?.serveName || "-")}</div></div>
        <div class="cell"><div class="cell-title">总代状态</div><div class="cell-value ${a.enabled ? "ok" : "bad"}">${a.enabled ? "已开启" : "已关闭"}</div></div>
        <div class="cell"><div class="cell-title">隐藏菜单</div><div class="cell-value">${d.agent?.hiddenMenuCount ?? 0} 项</div></div>
      </div>
      <div class="card">
        <div class="card-title"><i class="ri-robot-2-line"></i> BOT 资源</div>
        <div class="cell"><div class="cell-title">wxid</div><div class="cell-value">${esc(b.wxid || "-")}</div></div>
        <div class="cell"><div class="cell-title">传输模式</div><div class="cell-value">${esc(b.transport || "-")}</div></div>
        <div class="cell"><div class="cell-title">bot-server</div><div class="cell-value ${b.serverOk ? "ok" : "bad"}">${b.serverOk ? "在线" : "离线"}</div></div>
        <div class="cell"><div class="cell-title">服务地址</div><div class="cell-value mono">${esc(shortUrl(b.server))}</div></div>
      </div>
      <a class="btn-outline" href="${esc(a.uiUrl || "/agent/")}" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> 打开总代后台</a>
    </div>`;
  bindNav();
}

async function loadMenu() {
  const j = await api("/api/master/menu");
  const d = j.data || {};
  let sections = `
    <div class="card">
      <div class="card-title"><i class="ri-settings-3-line"></i> 功能开关</div>
      <div class="cell"><div class="cell-title">云槽位页面</div><div class="switch ${d.features?.showCloudSlots ? "on" : ""}" id="sw-cloud"></div></div>
      <div class="cell"><div class="cell-title">购买套餐</div><div class="switch ${d.features?.showBuyPage ? "on" : ""}" id="sw-buy"></div></div>
    </div>
    <button class="btn-block" id="save-features">保存功能开关</button>`;

  for (const sec of d.sections || []) {
    sections += `<section class="menu-section"><div class="section-head"><div class="section-dot accent"></div><div><div class="section-title">${esc(sec.title)}</div><span class="section-sub">${(sec.items || []).length} 项菜单</span></div></div><div class="menu-grid">`;
    let mi = 0;
    for (const item of sec.items || []) {
      const on = item.enabled !== false;
      const tone = on && mi % 2 === 1 ? " on-green" : "";
      mi += 1;
      sections += `<button type="button" class="menu-item${on ? tone : " off"}" data-route="${esc(item.route)}" data-on="${on ? "1" : "0"}">
        <div class="ico"><i class="${on ? "ri-checkbox-circle-line" : "ri-close-circle-line"}"></i></div>
        <span>${esc(item.title)}</span>
        <em class="menu-badge ${on ? "on" : "off"}">${on ? "显示" : "隐藏"}</em>
      </button>`;
    }
    sections += `</div></section>`;
  }

  $("#view-root").innerHTML = `${header("菜单管控", { back: true })}<div class="page-body">${sections}</div>`;
  bindNav();
  $("#view-root").querySelectorAll(".menu-item[data-route]").forEach((btn) => {
    btn.onclick = async () => {
      const route = btn.dataset.route;
      const enabled = btn.dataset.on !== "1";
      await api("/api/master/menu/toggle", { method: "POST", body: JSON.stringify({ route, enabled }) });
      toast(enabled ? "已显示" : "已隐藏");
      loadMenu();
    };
  });
  $("#sw-cloud").onclick = () => $("#sw-cloud").classList.toggle("on");
  $("#sw-buy").onclick = () => $("#sw-buy").classList.toggle("on");
  $("#save-features").onclick = async () => {
    await api("/api/master/menu", {
      method: "PUT",
      body: JSON.stringify({
        features: {
          showCloudSlots: $("#sw-cloud").classList.contains("on"),
          showBuyPage: $("#sw-buy").classList.contains("on"),
        },
      }),
    });
    toast("已保存");
    loadMenu();
  };
}

async function loadGroups() {
  if (!groupsSubView) return renderGroupsHub();
  return renderGroupDetail(groupsSubView);
}

async function renderGroupsHub() {
  const j = await api("/api/master/resources");
  const groups = j.data?.groups || [];
  const agent = j.data?.agent || {};
  const st = groupStats(groups);
  let list = "";
  if (!groups.length) {
    list = `<div class="group-empty">
      <div class="group-empty__ico"><i class="ri-group-line"></i></div>
      <div class="group-empty__title">暂无授权群</div>
      <div class="group-empty__desc">在 <code>config/groups/</code> 目录添加群配置文件即可</div>
    </div>`;
  } else {
    list = groupCompactList(groups, agent);
  }
  $("#view-root").innerHTML = `
    ${header("群授权", { back: true })}
    <div class="page-body">
      <div class="group-overview">
        <div class="group-stat-pill primary">
          <i class="ri-group-line"></i>
          <div><div class="n">${st.total}</div><div class="l">管理群</div></div>
        </div>
        <div class="group-stat-pill ok">
          <i class="ri-shield-check-line"></i>
          <div><div class="n">${st.valid}</div><div class="l">授权有效</div></div>
        </div>
        <div class="group-stat-pill accent">
          <i class="ri-user-star-line"></i>
          <div><div class="n">${agentAgentLabel(agent).split(" · ")[0]}</div><div class="l">归属总代</div></div>
        </div>
      </div>
      <section class="section">
        ${sectionHead("群列表", groups.length ? `共 ${groups.length} 个群 · 点击行查看详情` : "暂无配置")}
        ${list}
      </section>
    </div>`;
  bindNav();
}

async function renderGroupDetail(roomId) {
  const j = await api("/api/master/resources");
  const groups = j.data?.groups || [];
  const agent = j.data?.agent || {};
  const g = groups.find((x) => x.roomId === roomId);
  if (!g) {
    groupsSubView = null;
    return renderGroupsHub();
  }
  const cfg = g.config || {};
  const lic = fmtLicense(cfg.licenseExpires);
  const remainDays =
    lic.daysLeft != null && lic.status !== "bad"
      ? `${lic.daysLeft} 天`
      : lic.status === "bad"
        ? "已过期"
        : "—";
  $("#view-root").innerHTML = `
    ${header("群详情", { groupsBack: true })}
    <div class="page-body page-body--narrow">
      <div class="detail-tip">${esc(g.roomId)}</div>
      <div class="card">
        <div class="card-title"><i class="ri-team-line"></i> 群基础信息</div>
        <div class="cell"><div class="cell-title">群 ID</div><div class="cell-value mono">${esc(g.roomId)}</div></div>
        <div class="cell"><div class="cell-title">授权到期</div><div class="cell-value ${lic.status}">${esc(lic.text)}</div></div>
        <div class="cell"><div class="cell-title">剩余天数</div><div class="cell-value ${lic.status}">${esc(remainDays)}</div></div>
        <div class="cell"><div class="cell-title">回复账号 (BOT)</div><div class="cell-value">${esc(cfg.replyAccount || "未设置")}</div></div>
        <div class="cell"><div class="cell-title">配置文件</div><div class="cell-value mono">config/groups/${esc(g.roomId)}.yaml</div></div>
      </div>
      <div class="card">
        <div class="card-title"><i class="ri-user-star-line"></i> 归属总代</div>
        <div class="cell"><div class="cell-title">总代账号</div><div class="cell-value">${esc(agent.login?.username || "-")}</div></div>
        <div class="cell"><div class="cell-title">总代 UID</div><div class="cell-value">${agent.login?.uid ?? "-"}</div></div>
        <div class="cell"><div class="cell-title">服务名</div><div class="cell-value">${esc(agent.display?.serveName || "-")}</div></div>
        <div class="cell"><div class="cell-title">总代状态</div><div class="cell-value ${agent.enabled ? "ok" : "bad"}">${agent.enabled ? "已开启" : "已关闭"}</div></div>
      </div>
    </div>`;
  bindNav();
}

(async function init() {
  const token = getToken();
  if (!token) {
    showLogin();
    return;
  }
  try {
    const j = await api("/api/master/session");
    if (j.status === 1) {
      sessionUser = j.data.username || sessionUser;
      showApp();
    } else showLogin();
  } catch {
    showLogin();
  }
})();
