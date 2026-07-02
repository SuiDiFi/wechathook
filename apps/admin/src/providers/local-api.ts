import fs from "node:fs";
import path from "node:path";
import {
  getGroupsDir,
  listGroupConfigRoomIds,
  loadConfig,
  readGroupConfig,
} from "@wechathook/bot-core";
import type { AdminConfig } from "../config.js";
import { AGENT_UID_START } from "../agent-defaults.js";
import { getMasterStore } from "../master/store.js";

const SEED_DIR = "data/admin-seed";
const DEFAULT_HEAD = "/img/head.40740b2d.jpg";

function readSeed<T>(projectRoot: string, name: string, fallback: T): T {
  const file = path.join(projectRoot, SEED_DIR, name);
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function fmtTime(ts: number): string {
  const d = new Date(ts * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 完整侧栏菜单（受总控 hiddenRoutes 过滤） */
export function buildAgentMenus(projectRoot: string, config: AdminConfig): unknown {
  const raw = readSeed<{ menu: Array<{ title?: string; list?: Array<{ to?: string }> }> }>(
    projectRoot,
    "agent-menus-full.json",
    { menu: [] },
  );
  const store = getMasterStore(projectRoot, config);
  const menu = raw.menu
    .map((sec) => ({
      ...sec,
      list: store.filterMenuTree(sec.list ?? []),
    }))
    .filter((sec) => (sec.list?.length ?? 0) > 0);
  return { status: 1, message: "成功", data: { menu } };
}

/** 代理中心首页统计（已生效机器人数） */
export function buildAgentIndex(config: AdminConfig, projectRoot: string): unknown {
  const botConfig = loadConfig(config.configPath, projectRoot);
  const wxid = botConfig.bot.botWxid;
  return {
    status: 1,
    message: "成功",
    data: { weichat_count: wxid ? 1 : 0 },
  };
}

/** 全局站点配置（标题/公告，驱动 App 壳层） */
export function buildSettingIndex(projectRoot: string, config: AdminConfig): unknown {
  const policy = getMasterStore(projectRoot, config).load();
  return {
    status: 1,
    message: "成功",
    data: {
      status: 1,
      web_title: "wechathook 总代后台",
      web_bot_name: "wechathook",
      run_type: "h5",
      notice: policy.announcement || "",
      app_url: "",
      app_scheme: "",
      is_agent: 1,
    },
  };
}

export function buildLoginIsLogin(): unknown {
  return { status: 1, message: "is user", data: [1] };
}

export function buildHelpIndex(): unknown {
  return { status: 1, message: "成功", data: { list: [], notice: [] } };
}

export function buildMemberIndex(config: AdminConfig, projectRoot: string): unknown {
  const botConfig = loadConfig(config.configPath, projectRoot);
  const groupsDir = getGroupsDir(config.configPath, projectRoot);
  const roomIds = listGroupConfigRoomIds(groupsDir);
  const wxid = botConfig.bot.botWxid ?? "local-bot";
  const uid = config.login?.uid ?? AGENT_UID_START;
  const policy = getMasterStore(projectRoot, config).load();
  const serveName = policy.agent.display.serveName;
  const hasBot = Boolean(wxid);

  const groups = roomIds.map((roomId, i) => {
    const gc = readGroupConfig(groupsDir, roomId);
    const exp = gc?.licenseExpires ?? botConfig.groups[roomId]?.licenseExpires;
    return {
      id: i + 1,
      group_id: roomId,
      group_name: roomId.replace(/@chatroom$/, ""),
      expires_time: exp ? fmtTime(exp) : "",
      status: exp && exp * 1000 > Date.now() ? 1 : 0,
    };
  });

  return {
    status: 1,
    message: "成功",
    data: {
      wechat_info_show: hasBot,
      total: hasBot ? 1 : 0,
      account: hasBot
          ? [
              {
                wxid,
                nickname: "本机 Bot",
                headimgurl: DEFAULT_HEAD,
                status: 5,
                enable: 1,
                id: 1,
                login_time: fmtTime(Math.floor(Date.now() / 1000)),
                create_time: Math.floor(Date.now() / 1000),
                today: 0,
                yesterday: 0,
              },
            ]
          : [],
      groups,
      unused: 0,
      is_agent: 1,
      team: {
        list: [],
        group_count: groups.length,
        group_number: groups.length,
        id: uid,
        group_award: 0,
        get_news: 0,
        quota_num: policy.agent.display.quotaNum,
        serve_name: serveName,
        robot_content: policy.agent.display.robotContent,
      },
    },
  };
}

export function buildCodesGetList(projectRoot: string): unknown {
  const seed = readSeed<{ product: unknown[]; total: number; list: unknown[] }>(
    projectRoot,
    "codes-products.json",
    { product: [], total: 0, list: [] },
  );
  return { status: 1, message: "成功", data: { ...seed, total: 0, list: [] } };
}

export function buildGroupList(config: AdminConfig, projectRoot: string): unknown {
  const groupsDir = getGroupsDir(config.configPath, projectRoot);
  const roomIds = listGroupConfigRoomIds(groupsDir);
  const list = roomIds.map((roomId, i) => {
    const gc = readGroupConfig(groupsDir, roomId);
    return {
      id: i + 1,
      group_id: roomId,
      group_name: roomId.replace(/@chatroom$/, ""),
      expires_time: gc?.licenseExpires ? fmtTime(gc.licenseExpires) : "",
    };
  });
  return { status: 1, message: "成功", data: { list, total: list.length } };
}

export function buildGroupUnusedList(config: AdminConfig, projectRoot: string): unknown {
  return buildGroupList(config, projectRoot);
}
