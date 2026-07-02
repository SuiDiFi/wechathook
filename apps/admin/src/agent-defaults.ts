/** 总代 UID / 账号编号起始值（首个总代为 1000，后续递增 1001、1002…） */
export const AGENT_UID_START = 1000;

export const DEFAULT_AGENT_USERNAME = String(AGENT_UID_START);
export const DEFAULT_AGENT_PASSWORD = "000000";

export function nextAgentUid(existing: Array<{ login: { uid: number } }>): number {
  if (!existing.length) return AGENT_UID_START;
  const max = Math.max(...existing.map((a) => a.login.uid));
  return Math.max(AGENT_UID_START, max) + 1;
}
