(function (C) {
  C.agentResourceList = function agentResourceList(agents) {
    const head = `<div class="agent-cred-head agent-cred-head--uid">
    <span>代理 UID</span><span>状态</span><span></span>
  </div>`;
    const body = (agents || [])
      .map(
        (a) => `<button type="button" class="agent-cred-row agent-cred-row--uid" data-resource-detail="${C.esc(String(a.uid))}">
      <span class="agent-cred-name uid">${C.esc(String(a.uid))}</span>
      <span class="agent-cred-status ${a.enabled ? "ok" : "off"}">${a.enabled ? "正常" : "已关闭"}</span>
      <i class="ri-arrow-right-s-line agent-cred-arrow"></i>
    </button>`
      )
      .join("");
    return `<div class="agent-cred-list">${head}${body}</div>`;
  };

  C.loadResource = async function loadResource() {
    if (!C.resourceSubView) return C.renderResourceHub();
    return C.renderResourceDetail(C.resourceSubView);
  };

  C.renderResourceHub = async function renderResourceHub() {
    const j = await C.api("/api/master/resources");
    const d = j.data || {};
    const a = d.agent || {};
    let overrides = "";
    if (!(d.overrides || []).length) {
      overrides = `<div class="cell"><div class="cell-title">暂无</div><div class="cell-value">总代保存后出现</div></div>`;
    } else {
      for (const o of d.overrides) {
        overrides += `<div class="cell">
        <div class="cell-main"><div class="cell-title">${C.esc(o.op)}</div><div class="cell-label">${C.esc(o.updated?.slice(0, 19) || "")}</div></div>
        <a href="/agent-src-${C.esc(o.op)}" target="_blank" rel="noopener" style="color:var(--primary);font-size:13px;text-decoration:none"><i class="ri-eye-line"></i></a>
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
    C.$("#view-root").innerHTML = `
    ${C.header("资源总览", { back: true })}
    <div class="page-body">
      <section class="section">
        ${C.sectionHead("数据概览")}
        <div class="stat-grid">
          ${C.statCard("ri-user-line", "总代状态", `${enabledCount}/${agents.length} 开启`, enabledCount ? "ok" : "bad")}
          ${C.statCard("ri-eye-off-line", "隐藏菜单", a.hiddenMenuCount ?? 0, "accent")}
          ${C.statCard("ri-folder-line", "配置数", (d.overrides || []).length)}
          ${C.statCard("ri-team-line", "管理群", d.stats?.groupCount ?? 0)}
        </div>
      </section>
      <section class="section">
        ${C.sectionHead("总代理", "点击 UID 查看详情与 BOT 资源")}
        ${C.agentResourceList(agentRows)}
      </section>
      <div class="card">
        <div class="card-title"><i class="ri-file-list-3-line"></i> 已保存配置</div>
        ${overrides}
      </div>
    </div>`;
    C.bindNav();
  };

  C.renderResourceDetail = async function renderResourceDetail(uid) {
    const j = await C.api("/api/master/resources");
    const d = j.data || {};
    const agents = (d.agents || []).length ? d.agents : [d.agent].filter(Boolean);
    const a = agents.find((x) => String(x.login?.uid ?? x.uid ?? "") === String(uid));
    const b = d.bot || {};
    if (!a) {
      C.resourceSubView = null;
      return C.renderResourceHub();
    }
    C.$("#view-root").innerHTML = `
    ${C.header(`总代 UID ${C.esc(uid)}`, { resourceBack: true })}
    <div class="page-body page-body--narrow">
      <div class="detail-tip">该总代个人后台关联的账号信息与 BOT 资源。</div>
      <div class="card">
        <div class="card-title"><i class="ri-user-star-line"></i> 总代信息</div>
        <div class="cell"><div class="cell-title">登录账号</div><div class="cell-value">${C.esc(a.login?.username || "-")}</div></div>
        <div class="cell"><div class="cell-title">UID</div><div class="cell-value">${a.login?.uid ?? "-"}</div></div>
        <div class="cell"><div class="cell-title">服务名</div><div class="cell-value">${C.esc(a.display?.serveName || "-")}</div></div>
        <div class="cell"><div class="cell-title">总代状态</div><div class="cell-value ${a.enabled ? "ok" : "bad"}">${a.enabled ? "已开启" : "已关闭"}</div></div>
        <div class="cell"><div class="cell-title">隐藏菜单</div><div class="cell-value">${d.agent?.hiddenMenuCount ?? 0} 项</div></div>
      </div>
      <div class="card">
        <div class="card-title"><i class="ri-robot-2-line"></i> BOT 资源</div>
        <div class="cell"><div class="cell-title">wxid</div><div class="cell-value">${C.esc(b.wxid || "-")}</div></div>
        <div class="cell"><div class="cell-title">传输模式</div><div class="cell-value">${C.esc(b.transport || "-")}</div></div>
        <div class="cell"><div class="cell-title">bot-server</div><div class="cell-value ${b.serverOk ? "ok" : "bad"}">${b.serverOk ? "在线" : "离线"}</div></div>
        <div class="cell"><div class="cell-title">服务地址</div><div class="cell-value mono">${C.esc(C.shortUrl(b.server))}</div></div>
      </div>
      <a class="btn-outline" href="${C.esc(a.uiUrl || "/agent/")}" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> 打开总代后台</a>
    </div>`;
    C.bindNav();
  };
})(window.Console);
