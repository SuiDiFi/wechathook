/**
 * 群空间完整登录抓包（从 H5 反查 API，无需浏览器）
 */
import fs from "node:fs";
import path from "node:path";
import https from "node:https";

const HASH = "2f99cf79887dbb19efacaa631959cfec";
const PASSWORD = "111111";
const OUT = path.join(
  process.cwd(),
  "reference",
  "mtrobot-agent-portal",
  "api-samples",
  "group-space-entry",
);

function post(apiPath, body, extra = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: "api.wxmtu.com",
        path: "/api" + apiPath,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          from: "vh5",
          Origin: "https://wx.wxmtu.com",
          Referer: `https://wx.wxmtu.com/group-center-${HASH}`,
          ...extra,
        },
      },
      (res) => {
        let b = "";
        res.on("data", (c) => (b += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(b));
          } catch {
            resolve({ raw: b });
          }
        });
      },
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const get = await post("/GroupCenter/get", {
    group_id: HASH,
    user_type: 0,
  });
  const gid = get?.data?.group_info?.id;
  if (!gid) {
    console.error("GroupCenter/get failed", get);
    process.exit(1);
  }

  const login = await post("/Login/loginGroup", {
    id: gid,
    password: PASSWORD,
    code: "",
  });
  const auth = { token: login.data?.token, uid: login.data?.uid };

  const ops = [
    "sign",
    "menu",
    "welcome",
    "greentea",
    "tgrj",
    "lowlove",
    "weather",
    "partner",
    "fish",
    "son",
    "guessphrase",
  ];

  const out = {
    meta: {
      capturedAt: new Date().toISOString(),
      urlHash: HASH,
      group_id: gid,
      wxid: get.data.group_info.wxid,
      product: get.data.group_info.product,
      expires: get.data.group_info.expires_time,
      loginFlow: [
        "1. GroupCenter/get { group_id: urlHash }",
        "2. Login/loginGroup { id: group_info.id, password, code }",
        "3. GroupCenterSrc/srcGet { op, group_id, token+uid headers }",
      ],
    },
    GroupCenter_get: get,
    Login_loginGroup: {
      status: login.status,
      message: login.message,
      data: { uid: login.data?.uid, token: "[REDACTED]" },
    },
    GroupCenter_getContent: await post("/GroupCenter/getContent", { type: 0 }, auth),
    GroupCenterSrc: {},
  };

  fs.mkdirSync(path.join(OUT, "GroupCenterSrc_srcGet"), { recursive: true });

  for (const op of ops) {
    out.GroupCenterSrc[op] = await post(
      "/GroupCenterSrc/srcGet",
      { op, op_id: 0, group_id: gid },
      auth,
    );
    fs.writeFileSync(
      path.join(OUT, "GroupCenterSrc_srcGet", `${op}.json`),
      JSON.stringify(out.GroupCenterSrc[op], null, 2),
    );
  }

  fs.writeFileSync(
    path.join(OUT, "GroupCenter_get_by_hash.json"),
    JSON.stringify(get, null, 2),
  );
  fs.writeFileSync(
    path.join(OUT, "full-login-capture.json"),
    JSON.stringify(out, null, 2),
  );

  console.log("OK group_id=", gid, "wxid=", get.data.group_info.wxid);
  console.log("Saved to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
