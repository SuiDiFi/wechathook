import type { NormalizedMessage } from "@wechathook/shared";
import type { MengtuEventMessage } from "./types.js";

function readStringField(field: { String?: string } | string | undefined): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field.String ?? "";
}

export function parseMengtuMsg(raw: unknown): MengtuEventMessage | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as MengtuEventMessage;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as MengtuEventMessage;
  return null;
}

/** 将萌兔 event_type=2000 群消息转为插件可用的 NormalizedMessage */
export function normalizeMengtuGroupMessage(msg: MengtuEventMessage): NormalizedMessage | null {
  if (msg.event_type !== 2000) return null;

  const roomId = readStringField(msg.fromUserName);
  if (!roomId.endsWith("@chatroom")) return null;

  const senderWxid = msg.room_sender_by ?? "";
  const senderNick = msg.sender_profile?.nickName ?? senderWxid;
  const content = (msg.real_content ?? "").trim();
  const msgType = msg.msgType ?? 1;

  return {
    eventId: msg.newMsgId ?? `${Date.now()}`,
    roomId,
    senderWxid,
    senderNick,
    content,
    msgType,
    raw: msg,
  };
}

export function isGroupTextMessage(msg: MengtuEventMessage): boolean {
  return msg.event_type === 2000 && (msg.msgType === 1 || msg.msgType === undefined);
}
