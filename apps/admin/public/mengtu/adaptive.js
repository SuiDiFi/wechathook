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

  var shellEl = null;
  var resizeTimer = 0;
  var ro = null;

  function viewportWidth() {
    return global.innerWidth || document.documentElement.clientWidth || DESIGN_WIDTH;
  }

  function breakpoint() {
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

  function setRemRoot() {
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
    if (bp !== "mobile") {
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
    if (breakpoint() === "mobile") return;
    document.querySelectorAll(FIXED_SELECTORS).forEach(function (el) {
      el.classList.add("mt-fixed-to-shell");
    });
  }

  function scheduleUpdate() {
    if (resizeTimer) global.clearTimeout(resizeTimer);
    resizeTimer = global.setTimeout(function () {
      resizeTimer = 0;
      setRemRoot();
      measureShell();
      pinFixedLayers();
    }, 16);
  }

  function bindShellObservers() {
    shellEl = document.querySelector(".mt-adaptive-shell");
    if (!shellEl) return;

    if (typeof global.ResizeObserver !== "undefined") {
      ro = new global.ResizeObserver(scheduleUpdate);
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
    setRemRoot();
    bindShellObservers();
    measureShell();
    pinFixedLayers();

    global.addEventListener("resize", scheduleUpdate, { passive: true });
    global.addEventListener("orientationchange", scheduleUpdate, { passive: true });
    global.addEventListener("load", scheduleUpdate, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
