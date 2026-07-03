(function (C) {
  C.agentModCard = function agentModCard(icon, title, chips, sub, tone = "orange") {
    const chipsHtml = (chips || [])
      .filter(Boolean)
      .map((c) => `<span class="agent-mod-chip">${C.esc(c)}</span>`)
      .join("");
    return `<button type="button" class="mod-card mod-card--agent mod-card--${tone}" data-agent-sub="${sub}">
    <div class="agent-mod-head">
      <div class="ico ${tone === "green" ? "green" : ""}"><i class="${icon}"></i></div>
      <div class="agent-mod-title">${C.esc(title)}</div>
      <span class="mod-arrow"><i class="ri-arrow-right-s-line"></i></span>
    </div>
    <div class="agent-mod-chips">${chipsHtml}</div>
  </button>`;
  };

  C.agentCredList = function agentCredList(agents) {
    const rows = agents || [];
    const head = `<div class="agent-cred-head">
    <span>账号</span><span>UID</span><span>状态</span><span></span>
  </div>`;
    const body = rows
      .map(
        (r) => `<button type="button" class="agent-cred-row" data-agent-sub="login">
      <span class="agent-cred-name">${C.esc(r.login?.username || "-")}</span>
      <span class="agent-cred-uid">${C.esc(String(r.login?.uid ?? "-"))}</span>
      <span class="agent-cred-status ${r.enabled ? "ok" : "off"}">${r.enabled ? "正常" : "已禁用"}</span>
      <i class="ri-arrow-right-s-line agent-cred-arrow"></i>
    </button>`
      )
      .join("");
    return `<div class="agent-cred-list">${head}${body}</div>`;
  };

  C.agentToggleList = function agentToggleList(agents) {
    const head = `<div class="agent-cred-head agent-cred-head--toggle">
    <span>账号</span><span>UID</span><span>允许登录</span>
  </div>`;
    const body = (agents || [])
      .map(
        (a) => `<div class="agent-cred-row agent-cred-row--toggle">
      <span class="agent-cred-name">${C.esc(a.login?.username || "-")}</span>
      <span class="agent-cred-uid">${C.esc(String(a.login?.uid ?? "-"))}</span>
      <div class="switch ${a.enabled ? "on" : ""}" data-agent-toggle="${C.esc(String(a.login?.uid ?? ""))}" role="switch" aria-checked="${a.enabled ? "true" : "false"}"></div>
    </div>`
      )
      .join("");
    return `<div class="agent-cred-list">${head}${body}</div>`;
  };

  C.agentToggleSummary = function agentToggleSummary(agents) {
    const list = agents || [];
    const on = list.filter((a) => a.enabled).length;
    if (!list.length) return "暂无总代";
    if (on === list.length) return `${list.length} 个总代 · 全部开启`;
    if (on === 0) return `${list.length} 个总代 · 全部关闭`;
    return `${on}/${list.length} 已开启`;
  };

  C.announcePreview = function announcePreview(text) {
    const t = String(text ?? "").trim();
    if (!t) return "未设置";
    return t.length > 24 ? t.slice(0, 24) + "…" : t;
  };

  C.loadAgent = async function loadAgent() {
    if (!C.agentSubView) return C.renderAgentHub();
    if (C.agentSubView === "toggle") return C.renderAgentToggle();
    if (C.agentSubView === "login") return C.renderAgentLogin();
    if (C.agentSubView === "announce") return C.renderAgentAnnounce();
  };

  C.renderAgentHub = async function renderAgentHub() {
    const policy = await C.fetchPolicy();
    const agents = C.policyAgents(policy);
    C.$("#view-root").innerHTML = `
    ${C.header("总代设置", { back: true })}
    <div class="page-body page-body--agent">
      <section class="section section--agent">
        ${C.sectionHead("设置模块", "总代开关与公告")}
        <div class="mod-grid agent-mod-grid agent-mod-grid--duo">
          ${C.agentModCard("ri-list-check", "总代列表", [C.agentToggleSummary(agents)], "toggle", "orange")}
          ${C.agentModCard("ri-megaphone-line", "公告", [C.announcePreview(policy?.announcement)], "announce", "green")}
        </div>
      </section>
      <section class="section">
        ${C.sectionHead("登录凭据", "点击行编辑账号与密码")}
        ${C.agentCredList(agents)}
      </section>
      <a class="btn-outline" href="/agent/" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> 打开总代后台验证</a>
    </div>`;
    C.bindNav();
  };

  C.renderAgentToggle = async function renderAgentToggle() {
    const policy = await C.fetchPolicy();
    const agents = C.policyAgents(policy);
    C.$("#view-root").innerHTML = `
    ${C.header("总代列表", { agentBack: true })}
    <div class="page-body page-body--narrow">
      <div class="detail-tip">控制各总代个人后台 /agent/ 是否允许登录，可单独开关。</div>
      ${C.agentToggleList(agents)}
    </div>`;
    C.bindNav();
    C.$("#view-root").querySelectorAll("[data-agent-toggle]").forEach((sw) => {
      sw.onclick = async () => {
        const uid = Number(sw.dataset.agentToggle);
        const enabled = !sw.classList.contains("on");
        sw.classList.toggle("on", enabled);
        sw.setAttribute("aria-checked", enabled ? "true" : "false");
        try {
          await C.api("/api/master/agent/toggle", { method: "POST", body: JSON.stringify({ uid, enabled }) });
          C.toast(enabled ? "已允许该总代登录" : "已禁止该总代登录");
        } catch (e) {
          sw.classList.toggle("on", !enabled);
          sw.setAttribute("aria-checked", !enabled ? "true" : "false");
          C.toast(e.message || "保存失败");
        }
      };
    });
  };

  C.renderAgentLogin = async function renderAgentLogin() {
    const policy = await C.fetchPolicy();
    const p = policy?.agent || {};
    C.$("#view-root").innerHTML = `
    ${C.header("登录凭据", { agentBack: true })}
    <div class="page-body page-body--narrow">
      <div class="detail-tip">总代登录 /agent/ 时使用的账号信息。</div>
      <div class="card">
        <div class="field"><label>账号</label><input id="login-user" value="${C.esc(p.login?.username)}" placeholder="总代登录账号" /></div>
        <div class="field field--password">
          <label>密码</label>
          <div class="field-input-wrap">
            <input id="login-pass" type="password" value="${C.esc(p.login?.password)}" placeholder="总代登录密码" />
            <button type="button" class="btn-password-toggle" data-target="login-pass" aria-label="显示密码"><i class="ri-eye-line"></i></button>
          </div>
        </div>
        <div class="field"><label>UID</label><input id="login-uid" type="number" value="${p.login?.uid || 1000}" min="1000" /></div>
      </div>
      <button class="btn-block" id="save-login">保存</button>
    </div>`;
    C.bindNav();
    C.bindPasswordToggles(C.$("#view-root"));
    C.$("#save-login").onclick = async () => {
      policy.agent.login.username = C.$("#login-user").value.trim();
      policy.agent.login.password = C.$("#login-pass").value;
      policy.agent.login.uid = Number(C.$("#login-uid").value);
      policy.agent.display.serveName = policy.agent.login.username;
      const agents = C.policyAgents(policy);
      if (agents[0]) {
        agents[0].login = { ...policy.agent.login };
        agents[0].display = { ...agents[0].display, serveName: policy.agent.login.username };
        policy.agents = agents;
      }
      await C.savePolicy(policy, "登录凭据已保存");
      C.agentSubView = null;
      C.loadAgent();
    };
  };

  C.renderAgentAnnounce = async function renderAgentAnnounce() {
    const policy = await C.fetchPolicy();
    C.$("#view-root").innerHTML = `
    ${C.header("公告", { agentBack: true })}
    <div class="page-body page-body--narrow">
      <div class="detail-tip">展示在总代个人后台首页的公告内容，留空则不显示。</div>
      <div class="card">
        <div class="field"><label>公告内容</label><textarea id="announce" rows="6" placeholder="输入公告文字…">${C.esc(policy?.announcement || "")}</textarea></div>
      </div>
      <button class="btn-block" id="save-announce">保存</button>
    </div>`;
    C.bindNav();
    C.$("#save-announce").onclick = async () => {
      policy.announcement = C.$("#announce").value;
      await C.savePolicy(policy, "公告已保存");
      C.agentSubView = null;
      C.loadAgent();
    };
  };
})(window.Console);
