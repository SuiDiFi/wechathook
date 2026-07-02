/**
 * 空 API 响应：仅保证萌兔 UI 页面能渲染，不注入官方代理后台业务数据。
 * 真实数据仅来自 local-api（本机 Bot、config/groups、data/admin-seed 产品模板）。
 */

const ARCADE_TABS = [
  { key: 1, value: "FC" },
  { key: 2, value: "SFC" },
  { key: 3, value: "街机" },
  { key: 4, value: "GBA" },
  { key: 5, value: "H5" },
  { key: 6, value: "MD" },
];

export function resolveEmptyApi(apiPath: string, extra?: { codesProducts?: unknown[] }): unknown {
  const p = apiPath.toLowerCase();
  const ok = { status: 1, message: "成功" as const };

  if (p === "/agent/index") {
    return { ...ok, data: { weichat_count: 0 } };
  }

  if (p === "/setting/index") {
    return {
      ...ok,
      data: {
        status: 1,
        web_title: "wechathook 总代后台",
        web_bot_name: "wechathook",
        run_type: "h5",
        notice: "",
        app_url: "",
        app_scheme: "",
        is_agent: 1,
      },
    };
  }

  if (p === "/login/islogin") {
    return { ...ok, data: [1] };
  }

  if (p === "/codes/getlist") {
    return {
      ...ok,
      data: {
        product: extra?.codesProducts ?? [],
        total: 0,
        list: [],
      },
    };
  }

  if (p === "/user.proxy/index") {
    return { ...ok, data: { proxy: [], lose: [] } };
  }

  if (p === "/buy/getproduct") {
    return { ...ok, data: { list: [], agent: 0 } };
  }

  if (p === "/member/ipad") {
    return { ...ok, data: [] };
  }

  if (
    p === "/user.pc/index" ||
    p === "/user.mac/index" ||
    p === "/sever/index" ||
    p.endsWith("/index") && p.startsWith("/user.")
  ) {
    return { ...ok, data: [] };
  }

  if (p === "/arcade/gettabs") {
    return { ...ok, data: { tabs: ARCADE_TABS } };
  }

  if (p === "/arcade/getlist" || p === "/superbaby/getlist") {
    return { ...ok, data: { list: [] } };
  }

  if (p === "/help/index" || p === "/help/notice") {
    return { ...ok, data: { list: [], notice: [] } };
  }

  if (p === "/setting/count") {
    return { ...ok, data: {} };
  }

  if (p.startsWith("/groupcentersrc/") || p.startsWith("/groupcenter/")) {
    if (p.includes("srclist") || p.includes("getlist") || p.includes("users")) {
      return { ...ok, data: { list: [], total: 0 } };
    }
    if (p.includes("srcget") || p.includes("/get")) {
      return { ...ok, data: { form: [], title: "" } };
    }
    return { ...ok, data: {} };
  }

  if (p.startsWith("/product/")) {
    if (p.includes("list") || p.includes("entry") || p.includes("block")) {
      return { ...ok, data: { list: [], total: 0 } };
    }
    return { ...ok, data: {} };
  }

  if (p.startsWith("/template/")) {
    return { ...ok, data: { list: [], total: 0 } };
  }

  if (p.startsWith("/order/")) {
    return { ...ok, data: p.includes("check") ? { paid: 0 } : null };
  }

  if (p.startsWith("/account/")) {
    return { ...ok, data: p.includes("qrcode") ? { url: "" } : {} };
  }

  if (p.startsWith("/auth/")) {
    return { ...ok, data: {} };
  }

  if (p.startsWith("/login/")) {
    if (p.includes("captcha") || p.includes("islogin")) return { ...ok, data: [1] };
    return { ...ok, data: {} };
  }

  if (p.startsWith("/group/") && !p.includes("groupcenter")) {
    if (p.includes("list") || p.includes("unused")) {
      return { ...ok, data: { list: [], total: 0 } };
    }
    return { ...ok, data: {} };
  }

  if (p.includes("servers") || p.includes("proxies") || p.includes("nodes")) {
    return { ...ok, data: [] };
  }

  if (p.includes("checkstatus")) {
    return { status: 1, message: "成功", data: { status: 0 } };
  }

  if (
    p.includes("list") ||
    p.includes("index") ||
    p.includes("find") ||
    p.includes("select")
  ) {
    return { ...ok, data: { list: [], total: 0 } };
  }

  if (p.includes("captcha") || p.includes("islogin")) {
    return { ...ok, data: [1] };
  }

  if (
    p.includes("post") ||
    p.includes("set") ||
    p.includes("del") ||
    p.includes("add") ||
    p.includes("create") ||
    p.includes("sync") ||
    p.includes("save")
  ) {
    return { ...ok, data: null };
  }

  if (p.includes("get") || p.includes("src")) {
    return { ...ok, data: {} };
  }

  return { ...ok, data: {} };
}
