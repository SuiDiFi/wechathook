/**
 * 抓取萌兔群空间 H5 登录 + GroupCenterSrc API（Playwright）
 * 用法: node scripts/capture-mt-group-space.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const URL =
  "https://wx.wxmtu.com/group-center-2f99cf79887dbb19efacaa631959cfec";
const PASSWORD = "111111";
const OUT_DIR = path.join(
  process.cwd(),
  "reference",
  "mtrobot-agent-portal",
  "api-samples",
  "group-space-entry",
  "browser-capture",
);

const INTERESTING = [
  "/GroupCenter/",
  "/GroupCenterSrc/",
  "/Login/",
  "/Group/",
  "/Product/",
];

function safeName(url) {
  const u = new URL(url);
  const p = u.pathname.replace(/^\/api\//, "").replace(/\//g, "_");
  return p || "root";
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const captured = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  page.on("response", async (res) => {
    const url = res.url();
    if (!url.includes("api.wxmtu.com/api/")) return;
    if (!INTERESTING.some((p) => url.includes(p))) return;
    try {
      const req = res.request();
      const body = await res.text();
      let json;
      try {
        json = JSON.parse(body);
      } catch {
        json = body.slice(0, 2000);
      }
      let postData = null;
      try {
        postData = req.postDataJSON();
      } catch {
        postData = req.postData()?.slice(0, 2000) ?? null;
      }
      captured.push({
        url,
        method: req.method(),
        status: res.status(),
        request: postData,
        response: json,
      });
    } catch {
      /* ignore */
    }
  });

  console.log("[1/5] 打开群空间…", URL);
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });

  await page.waitForTimeout(2000);

  // 密码输入框：多种选择器兜底
  const passSelectors = [
    'input[type="password"]',
    'input[placeholder*="密码"]',
    'input[placeholder*="口令"]',
    ".auth-input input",
    ".van-field__control",
    "input.van-field__control",
  ];

  let filled = false;
  for (const sel of passSelectors) {
    const el = page.locator(sel).first();
    if (await el.count()) {
      await el.fill(PASSWORD);
      filled = true;
      console.log("[2/5] 已填密码，选择器:", sel);
      break;
    }
  }
  if (!filled) {
    // 截图 + HTML 供排查
    await page.screenshot({ path: path.join(OUT_DIR, "page-no-input.png"), fullPage: true });
    fs.writeFileSync(path.join(OUT_DIR, "page.html"), await page.content());
    console.warn("未找到密码框，已保存 page-no-input.png / page.html");
  }

  // 登录/确认按钮
  const btnSelectors = [
    'button:has-text("登录")',
    'button:has-text("确认")',
    'button:has-text("进入")',
    ".van-button",
    ".auth-btn",
    'div[role="button"]:has-text("登录")',
  ];
  for (const sel of btnSelectors) {
    const btn = page.locator(sel).first();
    if (await btn.count()) {
      try {
        await btn.click({ timeout: 3000 });
        console.log("[3/5] 已点击:", sel);
        break;
      } catch {
        /* next */
      }
    }
  }

  await page.waitForTimeout(4000);

  // 尝试进入签到配置
  const signSelectors = [
    'text=签到',
    '.van-cell:has-text("签到")',
    '[to="/group-src-sign"]',
  ];
  for (const sel of signSelectors) {
    const item = page.locator(sel).first();
    if (await item.count()) {
      try {
        await item.click({ timeout: 5000 });
        console.log("[4/5] 已进入签到:", sel);
        break;
      } catch {
        /* next */
      }
    }
  }

  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(OUT_DIR, "page-final.png"), fullPage: true });

  // 逐条落盘
  const summary = [];
  for (const item of captured) {
    const name = safeName(item.url);
    const file = path.join(OUT_DIR, `${name}.json`);
    fs.writeFileSync(
      file,
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          ...item,
        },
        null,
        2,
      ),
    );
    summary.push({
      file: path.relative(process.cwd(), file),
      url: item.url,
      status: item.status,
      request: item.request,
      responsePreview:
        typeof item.response === "object"
          ? {
              status: item.response.status,
              message: item.response.message,
              code: item.response.code,
            }
          : String(item.response).slice(0, 120),
    });
  }

  fs.writeFileSync(path.join(OUT_DIR, "_summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(
    path.join(OUT_DIR, "_all.json"),
    JSON.stringify(captured, null, 2),
  );

  console.log(`[5/5] 捕获 ${captured.length} 条 API → ${OUT_DIR}`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
