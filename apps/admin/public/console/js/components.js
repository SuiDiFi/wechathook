(function (C) {
  C.shortUrl = function shortUrl(url) {
    try {
      return new URL(url).host;
    } catch {
      return String(url ?? "").replace(/^https?:\/\//, "").slice(0, 40);
    }
  };

  C.header = function header(title, opts = {}) {
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
    return `<div class="page-header"><div>${back}</div><h2>${C.esc(title)}</h2><div>${right}</div></div>`;
  };

  C.bindNav = function bindNav() {
    C.$("#view-root").querySelectorAll("[data-go]").forEach((el) => {
      el.onclick = () => C.switchTab(el.dataset.go);
    });
    C.$("#view-root").querySelectorAll("[data-agent-sub]").forEach((el) => {
      el.onclick = () => {
        C.agentSubView = el.dataset.agentSub;
        C.loadAgent();
      };
    });
    C.$("#view-root").querySelectorAll("[data-agent-back]").forEach((el) => {
      el.onclick = () => {
        C.agentSubView = null;
        C.loadAgent();
      };
    });
    C.$("#view-root").querySelectorAll("[data-resource-detail]").forEach((el) => {
      el.onclick = () => {
        C.resourceSubView = el.dataset.resourceDetail;
        C.loadResource();
      };
    });
    C.$("#view-root").querySelectorAll("[data-resource-back]").forEach((el) => {
      el.onclick = () => {
        C.resourceSubView = null;
        C.loadResource();
      };
    });
    C.$("#view-root").querySelectorAll("[data-group-detail]").forEach((el) => {
      el.onclick = () => {
        C.groupsSubView = el.dataset.groupDetail;
        C.loadGroups();
      };
    });
    C.$("#view-root").querySelectorAll("[data-groups-back]").forEach((el) => {
      el.onclick = () => {
        C.groupsSubView = null;
        C.loadGroups();
      };
    });
    const logout = C.$("#view-root").querySelector("#btn-logout-hub");
    if (logout) {
      logout.onclick = async () => {
        try {
          await C.api("/api/master/logout", { method: "POST", body: "{}" });
        } catch (_) {}
        C.setToken("");
        C.showLogin();
      };
    }
  };

  C.statusTile = function statusTile(label, value, sub, tone = "") {
    return `<div class="status-tile ${tone}">
    <div class="st-label">${C.esc(label)}</div>
    <div class="st-value">${C.esc(value)}</div>
    <div class="st-sub">${C.esc(sub)}</div>
  </div>`;
  };

  C.sectionHead = function sectionHead(title, sub = "") {
    const subHtml = sub ? `<span class="section-sub">${C.esc(sub)}</span>` : "";
    return `<div class="section-head"><div class="section-dot"></div><div><div class="section-title">${C.esc(title)}</div>${subHtml}</div></div>`;
  };

  C.statCard = function statCard(icon, label, value, tone = "") {
    return `<div class="stat-card ${tone ? "tone-" + tone : ""}">
    <div class="stat-card-top"></div>
    <div class="ico ${tone}"><i class="${icon}"></i></div>
    <div class="stat-body">
      <div class="label">${C.esc(label)}</div>
      <div class="value">${C.esc(value)}</div>
    </div>
  </div>`;
  };

  C.modCard = function modCard(icon, title, desc, action, ext = false, tone = "") {
    const icoCls = ext ? "ico ext" : tone === "green" ? "ico green" : "ico";
    const cardCls = `mod-card${ext ? " mod-card--ext" : ""}${tone && !ext ? " mod-card--" + tone : ""}`;
    const arrow = ext
      ? `<span class="mod-arrow ext"><i class="ri-external-link-line"></i></span>`
      : `<span class="mod-arrow"><i class="ri-arrow-right-s-line"></i></span>`;
    const inner = `<div class="${icoCls}"><i class="${icon}"></i></div>
    <div class="mod-text"><div class="title">${C.esc(title)}</div><div class="desc">${C.esc(desc)}</div></div>
    ${arrow}`;
    if (action.startsWith("http") || action.startsWith("/")) {
      return `<a class="${cardCls}" href="${action}" target="_blank" rel="noopener">${inner}</a>`;
    }
    return `<button type="button" class="${cardCls}" data-go="${action}">${inner}</button>`;
  };

  C.fetchPolicy = async function fetchPolicy() {
    const j = await C.api("/api/master/policy");
    return j.data;
  };

  C.savePolicy = async function savePolicy(policy, msg = "已保存") {
    await C.api("/api/master/policy", { method: "PUT", body: JSON.stringify(policy) });
    C.toast(msg);
  };

  C.policyAgents = function policyAgents(policy) {
    if (policy?.agents?.length) return policy.agents;
    const a = policy?.agent || {};
    return [
      {
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
      },
    ];
  };

  C.bindPasswordToggles = function bindPasswordToggles(root = document) {
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
  };

  C.fmtLicense = function fmtLicense(ts) {
    if (!ts) return { text: "未设置", status: "warn", sub: "待设", daysLeft: null };
    const d = new Date(ts * 1000);
    const now = Date.now();
    const days = Math.ceil((d.getTime() - now) / 86400000);
    if (d.getTime() < now) return { text: d.toLocaleDateString(), status: "bad", sub: "已过期", daysLeft: 0 };
    if (days <= 30) return { text: d.toLocaleDateString(), status: "warn", sub: `${days} 天后到期`, daysLeft: days };
    return { text: d.toLocaleDateString(), status: "ok", sub: "授权有效", daysLeft: days };
  };

  C.shortRoomId = function shortRoomId(id) {
    const s = String(id ?? "");
    if (s.length <= 22) return s;
    return s.slice(0, 12) + "…" + s.slice(-10);
  };
})(window.Console);
