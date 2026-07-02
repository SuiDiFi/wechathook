import type {
  MemberJoinEvent,
  MemberLeaveEvent,
  NormalizedMessage,
} from "@wechathook/shared";

interface StringField {
  String?: string;
}

/** 萌兔 inject eventMessage（event_type=2000 群聊） */
export interface MengtuInjectMessage {
  event_type?: number;
  event_desc?: string;
  account_wxid?: string;
  acc_wxid?: string;
  real_content?: string;
  content?: StringField | string;
  room_sender_by?: string;
  fromUserName?: StringField | string;
  toUserName?: StringField | string;
  msgType?: number;
  newMsgId?: string;
  msgId?: number;
  member_info?: {
    userName?: string;
    nickName?: string;
    inviterUserName?: string;
  };
}

function readString(field: StringField | string | undefined): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field.String ?? "";
}

export function normalizeMengtuInjectGroupMessage(raw: unknown): NormalizedMessage | null {
  const msg = raw as MengtuInjectMessage;
  if (msg.event_type !== 2000) return null;

  const roomId = readString(msg.fromUserName);
  if (!roomId.endsWith("@chatroom")) return null;

  const senderWxid = msg.room_sender_by ?? msg.member_info?.userName ?? "";
  const senderNick = msg.member_info?.nickName ?? senderWxid;
  let content = (msg.real_content ?? readString(msg.content as StringField | undefined)).trim();
  if (!content && readString(msg.content as StringField | undefined)) {
    const rawContent = readString(msg.content as StringField | undefined);
    const colonIdx = rawContent.indexOf(":\n");
    content = colonIdx >= 0 ? rawContent.slice(colonIdx + 2).trim() : rawContent.trim();
  }

  return {
    eventId: msg.newMsgId ?? String(msg.msgId ?? Date.now()),
    roomId,
    senderWxid,
    senderNick,
    content,
    msgType: msg.msgType ?? 1,
    raw,
  };
}

export function normalizeMengtuInjectMemberJoin(raw: unknown): MemberJoinEvent | null {
  const msg = raw as MengtuInjectMessage;
  if (msg.event_type !== 2002 && msg.event_desc !== "进群消息") return null;
  const roomId = readString(msg.fromUserName);
  if (!roomId.endsWith("@chatroom")) return null;
  const memberWxid = msg.member_info?.userName ?? msg.room_sender_by ?? "";
  const memberNick = msg.member_info?.nickName ?? memberWxid;
  return {
    roomId,
    memberWxid,
    memberNick,
    inviterWxid: msg.member_info?.inviterUserName,
    raw,
  };
}

export function normalizeMengtuInjectMemberLeave(raw: unknown): MemberLeaveEvent | null {
  const msg = raw as MengtuInjectMessage;
  if (msg.event_type !== 2003 && msg.event_desc !== "退群消息") return null;
  const roomId = readString(msg.fromUserName);
  if (!roomId.endsWith("@chatroom")) return null;
  const memberWxid = msg.member_info?.userName ?? msg.room_sender_by ?? "";
  const memberNick = msg.member_info?.nickName ?? memberWxid;
  return { roomId, memberWxid, memberNick, raw };
}
