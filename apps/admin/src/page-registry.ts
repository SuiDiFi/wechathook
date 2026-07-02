/** 页面落地：live=本机真实数据 · preview=UI 空壳可浏览 */
export type PageTier = "live" | "preview" | "hidden";

export interface ConsolePage {
  route: string;
  title: string;
  tier: PageTier;
  op?: string;
}

export interface ConsoleSection {
  id: string;
  title: string;
  pages: ConsolePage[];
}

/** 由 local-api / empty-api 接管的读接口（不走萌兔归档） */
export const LOCAL_API_PATHS = new Set([
  "/Agent/menus",
  "/Agent/index",
  "/Member/menu",
  "/Member/index",
  "/Setting/index",
  "/Login/isLogin",
  "/Help/index",
  "/Help/notice",
  "/Codes/getList",
  "/Group/get",
  "/Group/getUnusedList",
  "/Group/selectGroup",
]);

export function tierLabel(tier: PageTier): string {
  if (tier === "live") return "已落地";
  if (tier === "preview") return "UI空壳";
  return "";
}

export function countConsolePages(sections: ConsoleSection[]): {
  total: number;
  live: number;
  preview: number;
} {
  let total = 0;
  let live = 0;
  let preview = 0;
  for (const s of sections) {
    for (const p of s.pages) {
      if (p.tier === "hidden") continue;
      total++;
      if (p.tier === "live") live++;
      if (p.tier === "preview") preview++;
    }
  }
  return { total, live, preview };
}
