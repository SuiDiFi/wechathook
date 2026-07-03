(function (C) {
  /** 兼容旧版 dashboard 字段，并统一概览统计口径 */
  C.normalizeDashStats = function normalizeDashStats(raw) {
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
  };

  C.loadDash = async function loadDash() {
    C.stopDashRefresh();
    const j = await C.api("/api/master/dashboard");
    if (j.status !== 1) {
      C.toast(j.message || "加载概览失败");
      return;
    }
    const d = C.normalizeDashStats(j.data);
    C.$("#view-root").innerHTML = `
    ${C.header("官方总控")}
    <div class="page-body page-body--grid">
      <div class="info-banner span-full">
        <div class="info-avatar"><i class="ri-admin-line"></i></div>
        <div class="info-content">
          <div class="label">当前管理员</div>
          <div class="value">${C.esc(C.sessionUser)}</div>
          <div class="info-meta">
            <span class="info-chip ${d.agentEnabled ? "ok" : "off"}">${d.agentEnabled ? "总代已开启" : "总代已关闭"}</span>
          </div>
        </div>
        <div class="info-badge ${(d.botOnlineCount ?? 0) > 0 ? "ok" : "bad"}">BOT 在线 ${d.botOnlineCount ?? 0}</div>
      </div>
      <section class="section span-full">
        ${C.sectionHead("数据概览", "实时统计")}
        <div class="stat-grid">
          ${C.statCard("ri-group-line", "授权群", d.groupValidCount ?? 0)}
          ${C.statCard("ri-user-star-line", "代理数量", d.agentCount ?? 0, "accent")}
          ${C.statCard("ri-team-line", "管理群", d.managedGroupCount ?? 0)}
          ${C.statCard("ri-robot-line", "BOT 在线数", d.botOnlineCount ?? 0, (d.botOnlineCount ?? 0) > 0 ? "ok" : "bad")}
        </div>
      </section>
      <section class="section span-full">
        ${C.sectionHead("功能模块", "点击进入管理")}
        <div class="mod-grid">
          ${C.modCard("ri-user-settings-line", "总代设置", "开关、凭据、公告", "agent", false, "orange")}
          ${C.modCard("ri-database-2-line", "资源总览", "Bot、配置、总代信息", "resource", false, "green")}
          ${C.modCard("ri-menu-line", "菜单管控", "显示/隐藏总代菜单", "menu", false, "orange")}
          ${C.modCard("ri-shield-check-line", "群授权", "config/groups 群列表", "groups", false, "green")}
          ${C.modCard("ri-external-link-line", "预览总代", "打开 /agent/ 个人后台", "/agent/", true)}
        </div>
      </section>
      <div class="card card--status span-full">
        <div class="card-title"><i class="ri-radar-line"></i> 服务监控</div>
        <div class="status-tiles">
          ${C.statusTile(
            "bot-server",
            d.botServerOk ? "正常" : "不可用",
            C.shortUrl(d.botServer),
            d.botServerOk ? "ok" : "bad"
          )}
          ${C.statusTile(
            "群授权",
            `${d.groupValidCount ?? 0} / ${d.groupCount ?? 0}`,
            "有效 / 已配置",
            (d.groupValidCount ?? 0) > 0 ? "ok" : "warn"
          )}
          ${C.statusTile(
            "即将过期",
            (d.groupExpiringSoonCount ?? 0) > 0 ? `${d.groupExpiringSoonCount} 个群` : "无",
            "30 天内到期",
            (d.groupExpiringSoonCount ?? 0) > 0 ? "warn" : "ok"
          )}
        </div>
      </div>
    </div>`;
    C.bindNav();
    C.dashRefreshTimer = setInterval(() => {
      if (C.currentTab === "dash") C.loadDash();
    }, 15000);
  };
})(window.Console);
