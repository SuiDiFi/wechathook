import type {
  GroupMember,
  IHookClient,
  HookApiResponse,
  MemberJoinEvent,
  MemberLeaveEvent,
  NormalizedMessage,
} from "@wechathook/shared";

export interface Hook4xAdapterOptions {
  baseUrl: string;
  timeoutMs?: number;
}

interface StringField {
  String?: string;
}

interface HookGroupMessagePayload {
  content?: StringField;
  createTime?: string;
  fromUserName?: StringField;
  member_info?: {
    nickName?: string;
    userName?: string;
    inviterUserName?: string;
  };
  messageType?: string;
  msgId?: string;
  msgType?: string;
  newMsgId?: string;
  real_content?: string;
  sender_nick?: string;
  toUserName?: StringField;
}

interface HookMemberJoinPayload {
  roomId?: string;
  room_id?: string;
  fromUserName?: StringField;
  member_info?: {
    nickName?: string;
    userName?: string;
    inviterUserName?: string;
  };
  nickName?: string;
  userName?: string;
}

function readString(field: StringField | string | undefined): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field.String ?? "";
}

export function normalizeGroupMessage(raw: unknown): NormalizedMessage | null {
  const payload = raw as HookGroupMessagePayload;
  const roomId = readString(payload.fromUserName);
  if (!roomId.endsWith("@chatroom")) return null;

  const senderWxid = payload.member_info?.userName ?? "";
  const senderNick =
    payload.sender_nick || payload.member_info?.nickName || senderWxid;
  const content = (payload.real_content ?? readString(payload.content)).trim();
  const msgType = Number.parseInt(payload.msgType ?? "1", 10);

  return {
    eventId: payload.newMsgId ?? payload.msgId ?? `${Date.now()}`,
    roomId,
    senderWxid,
    senderNick,
    content,
    msgType: Number.isNaN(msgType) ? 1 : msgType,
    raw,
  };
}

export function normalizeMemberJoin(raw: unknown): MemberJoinEvent | null {
  const payload = raw as HookMemberJoinPayload;
  const roomId =
    payload.roomId ??
    payload.room_id ??
    readString(payload.fromUserName);
  if (!roomId.endsWith("@chatroom")) return null;

  const memberWxid = payload.member_info?.userName ?? payload.userName ?? "";
  const memberNick =
    payload.member_info?.nickName ?? payload.nickName ?? memberWxid;

  return {
    roomId,
    memberWxid,
    memberNick,
    inviterWxid: payload.member_info?.inviterUserName,
    raw,
  };
}

export function normalizeMemberLeave(raw: unknown): MemberLeaveEvent | null {
  const payload = raw as HookMemberJoinPayload;
  const roomId =
    payload.roomId ??
    payload.room_id ??
    readString(payload.fromUserName);
  if (!roomId.endsWith("@chatroom")) return null;

  const memberWxid = payload.member_info?.userName ?? payload.userName ?? "";
  const memberNick =
    payload.member_info?.nickName ?? payload.nickName ?? memberWxid;

  return {
    roomId,
    memberWxid,
    memberNick,
    raw,
  };
}

export class Hook4xAdapter implements IHookClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private memberCache = new Map<string, { at: number; members: GroupMember[] }>();
  private readonly cacheTtlMs = 5 * 60 * 1000;

  constructor(options: Hook4xAdapterOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  async sendText(roomId: string, msg: string): Promise<void> {
    await this.post("/api/send_text_msg", { wxid: roomId, msg });
  }

  async sendAt(roomId: string, wxids: string, msg: string): Promise<void> {
    await this.post("/api/send_at_text", { roomId, wxids, msg });
  }

  async kickMember(roomId: string, wxid: string): Promise<void> {
    await this.post("/api/del_member_from_chat_room", {
      room_id: roomId,
      wxid_list: wxid,
    });
  }

  async getGroupMembers(roomId: string): Promise<GroupMember[]> {
    const cached = this.memberCache.get(roomId);
    if (cached && Date.now() - cached.at < this.cacheTtlMs) {
      return cached.members;
    }

    const response = await this.post<unknown>("/api/get_chatroom_member_list", {
      room_id: roomId,
    });

    const members = parseGroupMembers(response.data);
    this.memberCache.set(roomId, { at: Date.now(), members });
    return members;
  }

  private async post<T = unknown>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<HookApiResponse<T>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Hook API ${path} failed (${res.status}): ${text}`);
      }

      const json = (await res.json()) as HookApiResponse<T>;
      if (
        json.code !== undefined &&
        json.code !== 1 &&
        json.code !== 0 &&
        json.code !== 405
      ) {
        throw new Error(`Hook API ${path} error: ${json.msg ?? "unknown"}`);
      }
      return json;
    } finally {
      clearTimeout(timer);
    }
  }
}

function parseGroupMembers(data: unknown): GroupMember[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data
      .map((item) => {
        const row = item as Record<string, unknown>;
        return {
          wxid: String(row.userName ?? row.wxid ?? ""),
          nickName: String(row.nickName ?? row.nickname ?? row.wxid ?? ""),
        };
      })
      .filter((m) => m.wxid.length > 0);
  }

  const obj = data as Record<string, unknown>;
  const list = obj.member_list ?? obj.members ?? obj.list;
  if (Array.isArray(list)) {
    return parseGroupMembers(list);
  }

  return [];
}

export { Hook4xAdapter as default };
