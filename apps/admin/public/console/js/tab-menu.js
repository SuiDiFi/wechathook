(function (C) {
  C.loadMenu = async function loadMenu() {
    const j = await C.api("/api/master/menu");
    const d = j.data || {};
    let sections = `
    <div class="card">
      <div class="card-title"><i class="ri-settings-3-line"></i> 功能开关</div>
      <div class="cell"><div class="cell-title">云槽位页面</div><div class="switch ${d.features?.showCloudSlots ? "on" : ""}" id="sw-cloud"></div></div>
      <div class="cell"><div class="cell-title">购买套餐</div><div class="switch ${d.features?.showBuyPage ? "on" : ""}" id="sw-buy"></div></div>
    </div>
    <button class="btn-block" id="save-features">保存功能开关</button>`;

    for (const sec of d.sections || []) {
      sections += `<section class="menu-section"><div class="section-head"><div class="section-dot accent"></div><div><div class="section-title">${C.esc(sec.title)}</div><span class="section-sub">${(sec.items || []).length} 项菜单</span></div></div><div class="menu-grid">`;
      let mi = 0;
      for (const item of sec.items || []) {
        const on = item.enabled !== false;
        const tone = on && mi % 2 === 1 ? " on-green" : "";
        mi += 1;
        sections += `<button type="button" class="menu-item${on ? tone : " off"}" data-route="${C.esc(item.route)}" data-on="${on ? "1" : "0"}">
        <div class="ico"><i class="${on ? "ri-checkbox-circle-line" : "ri-close-circle-line"}"></i></div>
        <span>${C.esc(item.title)}</span>
        <em class="menu-badge ${on ? "on" : "off"}">${on ? "显示" : "隐藏"}</em>
      </button>`;
      }
      sections += `</div></section>`;
    }

    C.$("#view-root").innerHTML = `${C.header("菜单管控", { back: true })}<div class="page-body">${sections}</div>`;
    C.bindNav();
    C.$("#view-root").querySelectorAll(".menu-item[data-route]").forEach((btn) => {
      btn.onclick = async () => {
        const route = btn.dataset.route;
        const enabled = btn.dataset.on !== "1";
        await C.api("/api/master/menu/toggle", { method: "POST", body: JSON.stringify({ route, enabled }) });
        C.toast(enabled ? "已显示" : "已隐藏");
        C.loadMenu();
      };
    });
    C.$("#sw-cloud").onclick = () => C.$("#sw-cloud").classList.toggle("on");
    C.$("#sw-buy").onclick = () => C.$("#sw-buy").classList.toggle("on");
    C.$("#save-features").onclick = async () => {
      await C.api("/api/master/menu", {
        method: "PUT",
        body: JSON.stringify({
          features: {
            showCloudSlots: C.$("#sw-cloud").classList.contains("on"),
            showBuyPage: C.$("#sw-buy").classList.contains("on"),
          },
        }),
      });
      C.toast("已保存");
      C.loadMenu();
    };
  };
})(window.Console);
