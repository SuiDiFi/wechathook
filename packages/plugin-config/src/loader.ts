import fs from "node:fs";
import path from "node:path";
import type { SignGroupConfig } from "@wechathook/shared";
import { asString, isOpEnabled, parseFormValues } from "./form-parser.js";
import {
  agentOverridePath,
  groupOverridePath,
  mergeFormValues,
  readFlatOverride,
} from "./override-io.js";
import { AGENT_OVERRIDES_DIR, GROUP_OVERRIDES_DIR } from "./override-paths.js";
import { mapSignFormValues } from "./sign-mapper.js";
import type { MengtuOpConfig, SrcGetResponse, FormValues } from "./types.js";

export interface PluginConfigLoaderOptions {
  /** 项目根目录 */
  projectRoot: string;
  /** Agent/srcGet 归档目录（相对 projectRoot） */
  agentSrcDir?: string;
  /** GroupCenterSrc 群覆盖样例目录（相对 projectRoot） */
  groupSrcDir?: string;
  /** 总代 UI 保存覆盖（相对 projectRoot） */
  agentOverrideDir?: string;
  /** 群级 UI 保存覆盖（相对 projectRoot） */
  groupOverrideDir?: string;
}

const DEFAULT_AGENT = "reference/mtrobot-agent-portal/api-samples/full-sync/Agent/srcGet";
const DEFAULT_GROUP = "reference/mtrobot-agent-portal/api-samples/group-space-entry/GroupCenterSrc_srcGet";

export class PluginConfigLoader {
  private agentDir: string;
  private groupDir: string;
  private agentOverrideDir: string;
  private groupOverrideDir: string;
  private projectRoot: string;

  constructor(options: PluginConfigLoaderOptions) {
    this.projectRoot = options.projectRoot;
    const root = options.projectRoot;
    this.agentDir = path.join(root, options.agentSrcDir ?? DEFAULT_AGENT);
    this.groupDir = path.join(root, options.groupSrcDir ?? DEFAULT_GROUP);
    this.agentOverrideDir = path.join(root, options.agentOverrideDir ?? AGENT_OVERRIDES_DIR);
    this.groupOverrideDir = path.join(root, options.groupOverrideDir ?? GROUP_OVERRIDES_DIR);
  }

  /** 读取总代默认 op（含 data/agent-overrides 覆盖） */
  loadAgentOp(op: string): MengtuOpConfig | null {
    const flat = readFlatOverride(path.join(this.agentOverrideDir, `${op}.json`));
    return this.loadOpFromDir(this.agentDir, op, flat);
  }

  /** 读取群覆盖样例目录中的 op（归档样例，非运行时群 ID） */
  loadGroupSampleOp(op: string): MengtuOpConfig | null {
    return this.loadOpFromDir(this.groupDir, op, null);
  }

  /** 读取群级运行时覆盖 data/group-overrides/{roomId}/{op}.json */
  loadGroupOverride(roomId: string, op: string): MengtuOpConfig | null {
    const flat = readFlatOverride(groupOverridePath(this.projectRoot, roomId, op));
    if (!flat) return null;
    const agent = this.loadAgentOp(op);
    if (!agent) return null;
    const values = mergeFormValues(agent.values, flat);
    return { op, enabled: isOpEnabled(values), values };
  }

  /** 群覆盖 > 总代默认（含 agent-overrides） */
  resolveOp(roomId: string, op: string): MengtuOpConfig | null {
    return this.loadGroupOverride(roomId, op) ?? this.loadAgentOp(op);
  }

  /** sign：萌兔 form → 运行时 SignGroupConfig */
  resolveSignConfig(roomId: string): SignGroupConfig | null {
    const cfg = this.resolveOp(roomId, "sign");
    if (!cfg) return null;
    return mapSignFormValues(cfg.values);
  }

  /** menu.json → 菜单文本 */
  resolveMenuText(roomId: string): string | null {
    const op = this.resolveOp(roomId, "menu");
    if (!op || !op.enabled) return null;

    const custom = asString(op.values.message).trim();
    if (custom) return custom.replace(/\[换行\]/g, "\n");

    return `📋 功能菜单
签到 — 每日签到领金币
查有效期 — 查看群套餐到期
菜单 — 显示本菜单`;
  }

  listAgentOps(): string[] {
    if (!fs.existsSync(this.agentDir)) return [];
    return fs
      .readdirSync(this.agentDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));
  }

  /** 供 admin / 调试：当前 sign 生效配置摘要 */
  describeSign(roomId: string): Record<string, unknown> | null {
    const cfg = this.resolveSignConfig(roomId);
    if (!cfg) return null;
    return {
      roomId,
      agentOverride: fs.existsSync(agentOverridePath(this.projectRoot, "sign")),
      groupOverride: fs.existsSync(groupOverridePath(this.projectRoot, roomId, "sign")),
      ...cfg,
      messagePreview: (cfg.messageTemplate ?? "").slice(0, 80),
    };
  }

  /** 供 admin / 调试：当前 menu 生效配置摘要 */
  describeMenu(roomId: string): Record<string, unknown> | null {
    const op = this.resolveOp(roomId, "menu");
    if (!op) return null;
    const text = this.resolveMenuText(roomId);
    return {
      roomId,
      agentOverride: fs.existsSync(agentOverridePath(this.projectRoot, "menu")),
      groupOverride: fs.existsSync(groupOverridePath(this.projectRoot, roomId, "menu")),
      enabled: op.enabled,
      messagePreview: asString(op.values.message).slice(0, 80),
      menuTextPreview: text?.slice(0, 120) ?? null,
    };
  }

  private loadOpFromDir(
    dir: string,
    op: string,
    flatOverride: FormValues | null,
  ): MengtuOpConfig | null {
    const file = path.join(dir, `${op}.json`);
    if (!fs.existsSync(file)) return null;

    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as SrcGetResponse;
    const values = mergeFormValues(parseFormValues(raw.data?.form), flatOverride);
    return {
      op,
      enabled: isOpEnabled(values),
      values,
    };
  }
}
