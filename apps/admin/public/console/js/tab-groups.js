(function (C) {
  C.groupStats = function groupStats(groups) {
    let signOn = 0;
    let valid = 0;
    const now = Date.now();
    for (const g of groups) {
      if (g.config?.sign?.enabled) signOn += 1;
      const exp = g.config?.licenseExpires;
      if (exp && exp * 1000 > now) valid += 1;
    }
    return { total: groups.length, signOn, valid };
  };

  C.agentAgentLabel = function agentAgentLabel(agent) {
    const u = agent?.login?.username || "-";
    const uid = agent?.login?.uid ?? "-";
    return `${u} · UID ${uid}`;
  };

  C.groupCompactList = function groupCompactList(groups, agent) {
    const agentLabel = C.agentAgentLabel(agent);
    const head = `<div class="agent-cred-head group-cred-head">
    <span>群 ID</span><span>归属总代</span><span>授权</span><span></span>
  </div>`;
    const body = (groups || [])
      .map((g) => {
        const lic = C.fmtLicense(g.config?.licenseExpires);
        return `<button type="button" class="agent-cred-row group-cred-row" data-group-detail="${C.esc(g.roomId)}">
        <span class="group-row-id" title="${C.esc(g.roomId)}">${C.esc(C.shortRoomId(g.roomId))}</span>
        <span class="group-row-agent">${C.esc(agentLabel)}</span>
        <span class="agent-cred-status ${lic.status}">${C.esc(lic.sub || "待设")}</span>
        <i class="ri-arrow-right-s-line agent-cred-arrow"></i>
      </button>`;
      })
      .join("");
    return `<div class="agent-cred-list">${head}${body}</div>`;
  };

  C.loadGroups = async function loadGroups() {
    if (!C.groupsSubView) return C.renderGroupsHub();
    return C.renderGroupDetail(C.groupsSubView);
  };

  C.renderGroupsHub = async function renderGroupsHub() {
    const j = await C.api("/api/master/resources");
    const groups = j.data?.groups || [];
    const agent = j.data?.agent || {};
    const st = C.groupStats(groups);
    let list = "";
    if (!groups.length) {
      list = `<div class="group-empty">
      <div class="group-empty__ico"><i class="ri-group-line"></i></div>
      <div class="group-empty__title">暂无授权群</div>
      <div class="group-empty__desc">在 <code>config/groups/</code> 目录添加群配置文件即可</div>
    </div>`;
    } else {
      list = C.groupCompactList(groups, agent);
    }
    C.$("#view-root").innerHTML = `
    ${C.header("群授权", { back: true })}
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
          <div><div class="n">${C.agentAgentLabel(agent).split(" · ")[0]}</div><div class="l">归属总代</div></div>
        </div>
      </div>
      <section class="section">
        ${C.sectionHead("群列表", groups.length ? `共 ${groups.length} 个群 · 点击行查看详情` : "暂无配置")}
        ${list}
      </section>
    </div>`;
    C.bindNav();
  };

  C.renderGroupDetail = async function renderGroupDetail(roomId) {
    const j = await C.api("/api/master/resources");
    const groups = j.data?.groups || [];
    const agent = j.data?.agent || {};
    const g = groups.find((x) => x.roomId === roomId);
    if (!g) {
      C.groupsSubView = null;
      return C.renderGroupsHub();
    }
    const cfg = g.config || {};
    const lic = C.fmtLicense(cfg.licenseExpires);
    const remainDays =
      lic.daysLeft != null && lic.status !== "bad"
        ? `${lic.daysLeft} 天`
        : lic.status === "bad"
          ? "已过期"
          : "—";
    C.$("#view-root").innerHTML = `
    ${C.header("群详情", { groupsBack: true })}
    <div class="page-body page-body--narrow">
      <div class="detail-tip">${C.esc(g.roomId)}</div>
      <div class="card">
        <div class="card-title"><i class="ri-team-line"></i> 群基础信息</div>
        <div class="cell"><div class="cell-title">群 ID</div><div class="cell-value mono">${C.esc(g.roomId)}</div></div>
        <div class="cell"><div class="cell-title">授权到期</div><div class="cell-value ${lic.status}">${C.esc(lic.text)}</div></div>
        <div class="cell"><div class="cell-title">剩余天数</div><div class="cell-value ${lic.status}">${C.esc(remainDays)}</div></div>
        <div class="cell"><div class="cell-title">回复账号 (BOT)</div><div class="cell-value">${C.esc(cfg.replyAccount || "未设置")}</div></div>
        <div class="cell"><div class="cell-title">配置文件</div><div class="cell-value mono">config/groups/${C.esc(g.roomId)}.yaml</div></div>
      </div>
      <div class="card">
        <div class="card-title"><i class="ri-user-star-line"></i> 归属总代</div>
        <div class="cell"><div class="cell-title">总代账号</div><div class="cell-value">${C.esc(agent.login?.username || "-")}</div></div>
        <div class="cell"><div class="cell-title">总代 UID</div><div class="cell-value">${agent.login?.uid ?? "-"}</div></div>
        <div class="cell"><div class="cell-title">服务名</div><div class="cell-value">${C.esc(agent.display?.serveName || "-")}</div></div>
        <div class="cell"><div class="cell-title">总代状态</div><div class="cell-value ${agent.enabled ? "ok" : "bad"}">${agent.enabled ? "已开启" : "已关闭"}</div></div>
      </div>
    </div>`;
    C.bindNav();
  };
})(window.Console);
