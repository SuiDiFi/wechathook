/** 萌兔 /super/msg/callback 入站消息（event_type=2000 群聊） */
export interface MengtuEventMessage {
  event_type?: number;
  event_desc?: string;
  account_wxid?: string;
  acc_wxid?: string;
  real_content?: string;
  room_sender_by?: string;
  fromUserName?: { String?: string } | string;
  toUserName?: { String?: string } | string;
  msgType?: number;
  newMsgId?: string;
  sender_profile?: { nickName?: string };
  pushContent?: string;
  http_port?: number;
  client_mode?: string;
  kernel_mode?: string;
}

export interface SuperCallbackParams {
  tok?: string;
  mac?: string;
  usd?: number;
  mode?: string;
  client_mode?: string;
  kernel_mode?: string;
  msg?: MengtuEventMessage | string;
  acc_wxid?: string;
  group_wxid?: string;
  wxid?: string;
  type?: number;
}

/** 萌兔 handleMessagecallback 出站指令 */
export interface HandleMessageCallback {
  msg_type: number;
  acc_wxid: string;
  to_wxid?: string;
  wxid?: string;
  content?: string;
  url?: string;
  time?: number;
  type?: number;
  body?: Record<string, unknown>;
  group_wxid?: string;
  roomId?: string;
  room_id?: string;
}

export interface SuperApiResponse<T = unknown> {
  status: number;
  msg: string;
  data?: T;
  message?: string;
}

export interface ExplisEntry {
  group_wxid: string;
  expires: number;
}
