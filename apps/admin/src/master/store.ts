import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { AdminConfig } from "../config.js";
import {
  AGENT_UID_START,
  DEFAULT_AGENT_PASSWORD,
  DEFAULT_AGENT_USERNAME,
} from "../agent-defaults.js";

export interface AgentAccount {
  enabled: boolean;
  login: { username: string; password: string; uid: number };
  display: { serveName: string; robotContent: string; quotaNum: number };
}

export interface AgentPolicy {
  agent: {
    enabled: boolean;
    login: { username: string; password: string; uid: number };
    display: { serveName: string; robotContent: string; quotaNum: number };
    menu: { hiddenRoutes: string[] };
    features: { showCloudSlots: boolean; showBuyPage: boolean };
  };
  /** 总代账号列表，每项可独立开关 */
  agents?: AgentAccount[];
  announcement: string;
}

const CLOUD_ROUTES = [
  "/agent-center-account-pc",
  "/agent-center-account-ipad",
  "/agent-center-account-mac",
  "/agent-center-account-proxy",
  "/agent-center-sever",
];

const BUY_ROUTES = ["/agent-buy"];

const DEFAULT_POLICY: AgentPolicy = {
  agent: {
    enabled: true,
    login: { username: DEFAULT_AGENT_USERNAME, password: DEFAULT_AGENT_PASSWORD, uid: AGENT_UID_START },
    display: { serveName: DEFAULT_AGENT_USERNAME, robotContent: "自建 bot-server", quotaNum: 212 },
    menu: { hiddenRoutes: [] },
    features: { showCloudSlots: false, showBuyPage: false },
  },
  announcement: "",
};

export class MasterStore {
  private policyPath: string;

  constructor(
    private projectRoot: string,
    private adminConfig: AdminConfig,
  ) {
    this.policyPath = path.join(projectRoot, "data/master/agent-policy.yaml");
  }

  load(): AgentPolicy {
    if (!fs.existsSync(this.policyPath)) {
      return this.normalize(this.mergeWithAdminDefaults(structuredClone(DEFAULT_POLICY)));
    }
    const raw = yaml.load(fs.readFileSync(this.policyPath, "utf8")) as Partial<AgentPolicy>;
    const merged: AgentPolicy = {
      ...DEFAULT_POLICY,
      ...raw,
      agent: {
        ...DEFAULT_POLICY.agent,
        ...raw.agent,
        login: { ...DEFAULT_POLICY.agent.login, ...raw.agent?.login },
        display: { ...DEFAULT_POLICY.agent.display, ...raw.agent?.display },
        menu: { ...DEFAULT_POLICY.agent.menu, ...raw.agent?.menu },
        features: { ...DEFAULT_POLICY.agent.features, ...raw.agent?.features },
      },
      agents: raw.agents,
      announcement: raw.announcement ?? DEFAULT_POLICY.announcement,
    };
    return this.normalize(this.mergeWithAdminDefaults(merged));
  }

  save(policy: AgentPolicy): void {
    this.normalize(policy);
    fs.mkdirSync(path.dirname(this.policyPath), { recursive: true });
    fs.writeFileSync(this.policyPath, yaml.dump(policy, { lineWidth: 120, noRefs: true }), "utf8");
  }

  listAgents(): AgentAccount[] {
    return listAgents(this.load());
  }

  findAgentByUsername(username: string): AgentAccount | undefined {
    return this.listAgents().find((a) => a.login.username === username);
  }

  setAgentEnabled(uid: number, enabled: boolean): AgentPolicy {
    const policy = this.load();
    const agent = listAgents(policy).find((a) => a.login.uid === uid);
    if (!agent) throw new Error(`agent uid ${uid} not found`);
    agent.enabled = enabled;
    this.save(policy);
    return this.load();
  }

  effectiveHiddenRoutes(): Set<string> {
    const p = this.load();
    const hidden = new Set(p.agent.menu.hiddenRoutes);
    if (!p.agent.features.showCloudSlots) CLOUD_ROUTES.forEach((r) => hidden.add(r));
    if (!p.agent.features.showBuyPage) BUY_ROUTES.forEach((r) => hidden.add(r));
    return hidden;
  }

  filterMenuTree<T extends { to?: string }>(items: T[]): T[] {
    const hidden = this.effectiveHiddenRoutes();
    return items.filter((item) => !item.to || !hidden.has(item.to));
  }

  private mergeWithAdminDefaults(policy: AgentPolicy): AgentPolicy {
    const login = this.adminConfig.login;
    const primary = listAgents(policy)[0];
    if (login?.username) {
      policy.agent.login.username = login.username;
      primary.login.username = login.username;
    }
    if (login?.password !== undefined) {
      policy.agent.login.password = login.password;
      primary.login.password = login.password;
    }
    if (login?.uid) {
      policy.agent.login.uid = login.uid;
      primary.login.uid = login.uid;
    }
    policy.agent.display.serveName = policy.agent.login.username;
    primary.display.serveName = policy.agent.login.username;
    return policy;
  }

  private normalize(policy: AgentPolicy): AgentPolicy {
    if (!policy.agents?.length) {
      policy.agents = [accountFromLegacyAgent(policy.agent)];
    }
    const primary = policy.agents[0];
    policy.agent.enabled = primary.enabled;
    policy.agent.login = { ...primary.login };
    policy.agent.display = { ...primary.display };
    return policy;
  }
}

function accountFromLegacyAgent(agent: AgentPolicy["agent"]): AgentAccount {
  return {
    enabled: agent.enabled,
    login: { ...agent.login },
    display: { ...agent.display },
  };
}

export function listAgents(policy: AgentPolicy): AgentAccount[] {
  if (policy.agents?.length) return policy.agents;
  return [accountFromLegacyAgent(policy.agent)];
}

export function getMasterStore(projectRoot: string, config: AdminConfig): MasterStore {
  return new MasterStore(projectRoot, config);
}

export function listAgentOverrides(projectRoot: string): Array<{ op: string; file: string; updated: string }> {
  const dir = path.join(projectRoot, "data/agent-overrides");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const file = path.join(dir, f);
      const stat = fs.statSync(file);
      return { op: f.replace(/\.json$/, ""), file: `data/agent-overrides/${f}`, updated: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.updated.localeCompare(a.updated));
}
