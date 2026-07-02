import type { HandleMessageCallback } from "./types.js";

/** msg_type=1 发群文本 */
export function buildTextCallback(input: {
  accWxid: string;
  roomId: string;
  content: string;
}): HandleMessageCallback {
  return {
    msg_type: 1,
    acc_wxid: input.accWxid,
    to_wxid: input.roomId,
    wxid: input.roomId,
    content: input.content,
  };
}

/**
 * msg_type=16 远程 rabbitr 调用（登录后拉群列表等）
 * 客户端收到后请求本地 /r/sqe 等，再把结果 POST 回 callback
 */
export function buildRemoteCallCallback(input: {
  accWxid: string;
  time?: number;
  body?: Record<string, unknown>;
}): HandleMessageCallback {
  return {
    msg_type: 16,
    acc_wxid: input.accWxid,
    to_wxid: "",
    wxid: "",
    time: input.time ?? Math.floor(Date.now() / 1000),
    type: 16,
    body: input.body,
  };
}

/** msg_type=19 私聊/@ 成员 */
export function buildPrivateCallback(input: {
  accWxid: string;
  toWxid: string;
}): HandleMessageCallback {
  return {
    msg_type: 19,
    acc_wxid: input.accWxid,
    to_wxid: input.toWxid,
  };
}

/** msg_type=50 群列表同步标记 */
export function buildGroupSyncCallback(input: {
  accWxid: string;
  roomId: string;
}): HandleMessageCallback {
  return {
    msg_type: 50,
    acc_wxid: input.accWxid,
    to_wxid: input.roomId,
    wxid: input.roomId,
    group_wxid: input.roomId,
    roomId: input.roomId,
    room_id: input.roomId,
  };
}

/** 登录成功后常见的拉群 SQL（来自 inject 日志） */
export const LOGIN_GROUP_LIST_SQL = {
  db: "contact.db",
  sq: "SELECT nick_name, username, remark, small_head_url FROM contact WHERE username LIKE '%chatroom%' AND delete_flag !=1 AND is_in_chat_room ==1;",
} as const;
