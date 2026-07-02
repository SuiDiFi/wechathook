/** Hook 出站 API 抽象 — 插件通过此接口发送消息，不依赖具体 Hook 实现 */
export interface IHookClient {
  sendText(roomId: string, msg: string): Promise<void>;
  sendAt(roomId: string, wxids: string, msg: string): Promise<void>;
  kickMember(roomId: string, wxid: string): Promise<void>;
  getGroupMembers(roomId: string): Promise<GroupMember[]>;
}

export interface GroupMember {
  wxid: string;
  nickName: string;
}

/** 标准化群消息事件 */
export interface NormalizedMessage {
  eventId: string;
  roomId: string;
  senderWxid: string;
  senderNick: string;
  content: string;
  msgType: number;
  raw: unknown;
}

/** 群成员进群事件 */
export interface MemberJoinEvent {
  roomId: string;
  memberWxid: string;
  memberNick: string;
  inviterWxid?: string;
  raw: unknown;
}

/** 群成员退群事件 */
export interface MemberLeaveEvent {
  roomId: string;
  memberWxid: string;
  memberNick: string;
  raw: unknown;
}

export type BotEvent =
  | { type: "message"; data: NormalizedMessage }
  | { type: "member_join"; data: MemberJoinEvent }
  | { type: "member_leave"; data: MemberLeaveEvent };

/** 插件元信息 */
export interface PluginMeta {
  id: string;
  name: string;
  version: string;
  description?: string;
  commands?: string[];
}

/** 插件运行时上下文 */
export interface PluginContext {
  hook: IHookClient;
  config: BotConfig;
  storage: IStorage;
  logger: Logger;
  isAdmin(roomId: string, wxid: string): boolean;
  isPluginEnabled(roomId: string, pluginId: string): boolean;
  getEnabledPlugins(roomId: string): string[];
}

export interface Logger {
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
}

/** 插件接口契约 */
export interface BotPlugin {
  meta: PluginMeta;
  onLoad?(ctx: PluginContext): void | Promise<void>;
  onMessage?(msg: NormalizedMessage, ctx: PluginContext): Promise<boolean>;
  onMemberJoin?(event: MemberJoinEvent, ctx: PluginContext): Promise<void>;
  onMemberLeave?(event: MemberLeaveEvent, ctx: PluginContext): Promise<void>;
}

/** 插件 manifest（plugins/<name>/plugin.json） */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  enabled?: boolean;
  commands?: string[];
  main?: string;
}

/** 传输层模式 */
export type TransportMode = "hook41827" | "rabbitr41955";

/** 全局配置 */
export interface BotConfig {
  /** 出站/入站微信 I/O 实现，默认 hook41827 */
  transport?: {
    mode?: TransportMode;
  };
  /** 萌兔 rabbitr inject（4.1.9.55） */
  rabbitr?: {
    dllPath?: string;
    wechatExe?: string;
    wechatVersion?: string;
  };
  hook: {
    baseUrl: string;
    webhookSecret?: string;
    /** http = Hook POST 到回调地址；tcp = 监听 TCP 61108 */
    receiveMode?: "http" | "tcp";
    callbackPath?: string;
    tcpHost?: string;
    tcpPort?: number;
    /** Hook 内置 HTTP API 端口，默认 19088 */
    httpServerPort?: number;
  };
  bot: {
    commandPrefix: string;
    ownerWxids: string[];
    adminWxids: string[];
    botWxid?: string;
    allowedRooms: string[];
    port: number;
  };
  plugins: {
    globalEnabled: string[];
    dir: string;
  };
  storage: {
    dbPath: string;
  };
  groups: Record<string, GroupConfig>;
  /** 自建 bot-server 联调（inject 收消息 → /super/msg/callback → /r/stm） */
  botServer?: {
    url: string;
    relayEnabled?: boolean;
  };
}

/** 萌兔 sign.json 对齐的群级签到配置 */
export interface SignGroupConfig {
  enabled?: boolean;
  keyword?: string;
  messageTemplate?: string;
  minCoins?: number;
  maxCoins?: number;
  minDiamonds?: number;
  maxDiamonds?: number;
}

export interface GroupConfig {
  enabledPlugins?: string[];
  welcomeMessage?: string;
  /** 该群由哪个微信号发消息（对齐 handleMessagecallback.acc_wxid） */
  replyAccount?: string;
  /** explis 授权到期 Unix 秒；未设置则视为未授权 */
  licenseExpires?: number;
  sign?: SignGroupConfig;
}

/** 存储抽象 */
export interface IStorage {
  upsertUser(wxid: string, nick: string, roomId?: string): void;
  getUser(wxid: string): UserRecord | undefined;
  addPoints(wxid: string, points: number): number;
  getPoints(wxid: string): number;
  checkin(roomId: string, wxid: string): { success: boolean; streak: number; totalPoints: number };
  hasCheckedInToday(roomId: string, wxid: string): boolean;
  getLeaderboard(roomId: string, limit?: number): LeaderboardEntry[];
  getPluginConfig(roomId: string, pluginName: string): Record<string, unknown> | undefined;
  setPluginConfig(roomId: string, pluginName: string, config: Record<string, unknown>): void;
  getGameSession(roomId: string, pluginId: string): GameSession | undefined;
  setGameSession(roomId: string, pluginId: string, session: GameSession | null): void;
}

export interface UserRecord {
  wxid: string;
  nick: string;
  points: number;
  updatedAt: string;
}

export interface LeaderboardEntry {
  wxid: string;
  nick: string;
  points: number;
}

export interface GameSession {
  pluginId: string;
  roomId: string;
  state: string;
  data: Record<string, unknown>;
  startedAt: string;
}

export interface HookApiResponse<T = unknown> {
  code?: number;
  msg?: string;
  data?: T;
}
