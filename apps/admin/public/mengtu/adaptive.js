/**
 * 萌兔总代 · H5 / Web 深度自适应
 * 通过 CSS 变量 + 壳层度量，对齐 Vant  teleport 到 body 的固定层
 */
(function (global) {
  "use strict";

  var BP_TABLET = 768;
  var BP_DESKTOP = 1200;
  var DESIGN_WIDTH = 375;
  var REM_MIN = 85;
  var REM_MAX = 100;
  var MOBILE_LAYOUT_MAX = 480;
  var OP_MENU_LAYOUT_KEY = "mt-op-menu-layout";

  var shellEl = null;
  var resizeTimer = 0;
  var ro = null;
  var mobileRemPx = null;
  var mobileLayoutWidth = null;
  var wechatGuardsBound = false;

  function isWeChat() {
    return /MicroMessenger/i.test(navigator.userAgent || "");
  }

  function isWeChatMobile() {
    return isWeChat() && viewportWidth() < BP_TABLET;
  }

  function viewportWidth() {
    if (global.visualViewport && global.visualViewport.width > 0) {
      return global.visualViewport.width;
    }
    return global.innerWidth || document.documentElement.clientWidth || DESIGN_WIDTH;
  }

  function breakpoint() {
    if (isWeChatMobile()) return "mobile";
    var vw = viewportWidth();
    if (vw >= BP_DESKTOP) return "desktop";
    if (vw >= BP_TABLET) return "tablet";
    return "mobile";
  }

  function designWidthForRem() {
    var vw = viewportWidth();
    var bp = breakpoint();
    if (bp === "desktop") return 820;
    if (bp === "tablet") return 480;
    return Math.min(vw, MOBILE_LAYOUT_MAX);
  }

  function applyWeChatEnv() {
    var root = document.documentElement;
    root.dataset.mtWechat = isWeChat() ? "1" : "0";
    root.dataset.mtWechatMobile = isWeChatMobile() ? "1" : "0";
  }

  function resetWeChatViewport() {
    if (!isWeChat()) return;
    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    var content = meta.getAttribute("content");
    if (!content) return;
    meta.setAttribute("content", content.replace(/,\s*$/, "") + ",");
    global.setTimeout(function () {
      meta.setAttribute("content", content);
    }, 0);
  }

  function bindWeChatInputGuards() {
    if (wechatGuardsBound) return;
    wechatGuardsBound = true;

    document.addEventListener(
      "focusin",
      function (e) {
        var t = e.target;
        if (!t || !t.tagName) return;
        var tag = t.tagName.toUpperCase();
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
          document.documentElement.dataset.mtInputFocus = "1";
        }
      },
      true,
    );

    document.addEventListener(
      "focusout",
      function (e) {
        var t = e.target;
        if (!t || !t.tagName) return;
        var tag = t.tagName.toUpperCase();
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
          delete document.documentElement.dataset.mtInputFocus;
          global.setTimeout(resetWeChatViewport, 100);
        }
      },
      true,
    );
  }

  function setRemRoot(force) {
    var bp = breakpoint();
    applyWeChatEnv();

    if (bp === "mobile") {
      if (mobileLayoutWidth == null || force) {
        mobileLayoutWidth = Math.min(
          global.screen && global.screen.width ? global.screen.width : viewportWidth(),
          MOBILE_LAYOUT_MAX,
        );
      }
      if (mobileRemPx == null || force) {
        mobileRemPx = Math.min(
          Math.max(mobileLayoutWidth / (DESIGN_WIDTH / REM_MAX), REM_MIN),
          REM_MAX,
        );
      }
      document.documentElement.style.fontSize = mobileRemPx + "px";
      return;
    }

    mobileRemPx = null;
    mobileLayoutWidth = null;
    var w = designWidthForRem();
    var px = Math.min(Math.max(w / (DESIGN_WIDTH / REM_MAX), REM_MIN), REM_MAX);
    document.documentElement.style.fontSize = px + "px";
  }

  function measureShell() {
    var root = document.documentElement;
    var bp = breakpoint();
    root.dataset.mtViewport = bp;

    if (!shellEl) {
      root.style.setProperty("--mt-shell-max", "100%");
      root.style.setProperty("--mt-shell-left", "0px");
      root.style.setProperty("--mt-shell-right", "0px");
      root.style.setProperty("--mt-shell-pad-y", "0px");
      return;
    }

    var rect = shellEl.getBoundingClientRect();
    var padY = 0;
    if (bp !== "mobile" && !isWeChatMobile()) {
      var bodyPad = global.getComputedStyle(document.body).paddingTop;
      padY = parseFloat(bodyPad) || 0;
    }

    root.style.setProperty("--mt-shell-max", Math.round(rect.width) + "px");
    root.style.setProperty("--mt-shell-left", Math.round(rect.left) + "px");
    root.style.setProperty("--mt-shell-right", Math.round(rect.right) + "px");
    root.style.setProperty("--mt-shell-pad-y", padY + "px");
    root.style.setProperty(
      "--mt-shell-center-x",
      Math.round(rect.left + rect.width / 2) + "px",
    );
  }

  var FIXED_SELECTORS =
    ".van-tabbar,.van-nav-bar--fixed,.van-submit-bar,.van-goods-action," +
    ".van-sticky--fixed,.van-popup--bottom,.van-popup--top,.van-action-sheet," +
    ".van-number-keyboard";

  function pinFixedLayers() {
    if (breakpoint() === "mobile" || isWeChatMobile()) return;
    document.querySelectorAll(FIXED_SELECTORS).forEach(function (el) {
      el.classList.add("mt-fixed-to-shell");
    });
  }

  function getOpMenuLayout() {
    try {
      var v = localStorage.getItem(OP_MENU_LAYOUT_KEY);
      return v === "grid" ? "grid" : "list";
    } catch (_) {
      return "list";
    }
  }

  function syncOpMenuLayoutButtons(mode) {
    document.querySelectorAll(".mt-op-menu-segment-btn[data-layout]").forEach(function (btn) {
      var active = btn.getAttribute("data-layout") === mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function applyOpMenuLayout(mode) {
    document.querySelectorAll(".page.mt-op-menu-page").forEach(function (page) {
      page.classList.toggle("mt-op-menu-layout-list", mode === "list");
      page.classList.toggle("mt-op-menu-layout-grid", mode === "grid");
    });
    syncOpMenuLayoutButtons(mode);
  }

  function setOpMenuLayout(mode) {
    if (mode !== "list" && mode !== "grid") mode = "list";
    try {
      localStorage.setItem(OP_MENU_LAYOUT_KEY, mode);
    } catch (_) {}
    applyOpMenuLayout(mode);
  }

  function bindOpMenuToolbar(bar) {
    if (bar.dataset.mtBound === "1") return;
    bar.querySelectorAll(".mt-op-menu-segment-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setOpMenuLayout(btn.getAttribute("data-layout"));
      });
    });
    bar.dataset.mtBound = "1";
  }

  function createOpMenuToolbar() {
    var bar = document.createElement("div");
    bar.className = "mt-op-menu-toolbar";
    bar.innerHTML =
      '<span class="mt-op-menu-toolbar-label">视图</span>' +
      '<div class="mt-op-menu-segment" role="tablist" aria-label="配置菜单视图">' +
      '<button type="button" class="mt-op-menu-segment-btn" data-layout="list" role="tab">列表</button>' +
      '<button type="button" class="mt-op-menu-segment-btn" data-layout="grid" role="tab">宫格</button>' +
      "</div>";
    bindOpMenuToolbar(bar);
    return bar;
  }

  function placeOpMenuToolbar(page, bar) {
    var placeholder = page.querySelector(".van-nav-bar__placeholder");
    var anchor = placeholder || page.querySelector(".van-nav-bar");
    if (!anchor || !anchor.parentNode) {
      if (!bar.parentNode) page.insertBefore(bar, page.firstChild);
      return;
    }
    var parent = anchor.parentNode;
    if (bar.parentNode !== parent || bar.previousElementSibling !== anchor) {
      parent.insertBefore(bar, anchor.nextSibling);
    }
  }

  function ensureOpMenuToolbar(page) {
    var bar = page.querySelector(".mt-op-menu-toolbar");
    if (!bar) bar = createOpMenuToolbar();
    else bindOpMenuToolbar(bar);
    placeOpMenuToolbar(page, bar);
  }

  function normalizeAgentCenterHub() {
    var shell = document.querySelector(".mt-adaptive-shell");
    if (!shell) return;

    shell.querySelectorAll(".auth-body").forEach(function (body) {
      var quan = body.querySelector(".quan");
      var isHub = quan && quan.querySelector(".one-1") && quan.querySelector(".big");
      body.classList.toggle("mt-agent-center-list", Boolean(isHub));
    });
  }

  function normalizeOpMenuPages() {
    var shell = document.querySelector(".mt-adaptive-shell");
    if (!shell) return;

    var mode = getOpMenuLayout();

    shell.querySelectorAll(".page").forEach(function (page) {
      var isOpMenu = page.querySelector(".function-list .function-item");
      page.classList.toggle("mt-op-menu-page", Boolean(isOpMenu));
      if (!isOpMenu) {
        page.classList.remove("mt-op-menu-layout-list", "mt-op-menu-layout-grid");
        return;
      }
      page.classList.toggle("mt-op-menu-layout-list", mode === "list");
      page.classList.toggle("mt-op-menu-layout-grid", mode === "grid");
      ensureOpMenuToolbar(page);
    });

    syncOpMenuLayoutButtons(mode);
  }

  function normalizeAdaptivePages() {
    normalizeAgentCenterHub();
    normalizeOpMenuPages();
  }

  function runLayoutUpdate(opts) {
    opts = opts || {};
    applyWeChatEnv();
    if (!opts.skipRem) setRemRoot(false);
    measureShell();
    pinFixedLayers();
    normalizeAdaptivePages();
  }

  function scheduleUpdate(opts) {
    if (resizeTimer) global.clearTimeout(resizeTimer);
    resizeTimer = global.setTimeout(function () {
      resizeTimer = 0;
      runLayoutUpdate(opts);
    }, 16);
  }

  function onViewportChange() {
    var w = viewportWidth();
    if ((breakpoint() === "mobile" || isWeChatMobile()) && mobileLayoutWidth != null) {
      if (Math.abs(w - mobileLayoutWidth) < 8) {
        scheduleUpdate({ skipRem: true });
        return;
      }
    }
    scheduleUpdate();
  }

  function bindShellObservers() {
    shellEl = document.querySelector(".mt-adaptive-shell");
    if (!shellEl) return;

    if (typeof global.ResizeObserver !== "undefined") {
      ro = new global.ResizeObserver(function () {
        onViewportChange();
      });
      ro.observe(shellEl);
    }

    if (typeof global.MutationObserver !== "undefined") {
      var mo = new global.MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].addedNodes.length) {
            scheduleUpdate();
            break;
          }
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }
  }

  function init() {
    applyWeChatEnv();
    bindWeChatInputGuards();
    setRemRoot(true);
    bindShellObservers();
    runLayoutUpdate();

    global.addEventListener("resize", onViewportChange, { passive: true });
    global.addEventListener("orientationchange", function () {
      mobileRemPx = null;
      mobileLayoutWidth = null;
      scheduleUpdate();
    }, { passive: true });
    global.addEventListener("load", function () {
      resetWeChatViewport();
      scheduleUpdate();
    }, { passive: true });
    if (global.visualViewport) {
      global.visualViewport.addEventListener("resize", onViewportChange, { passive: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
