import type { MemberJoinEvent, MemberLeaveEvent, NormalizedMessage } from "@wechathook/shared";

export type HookCallbackKind =
  | "group_message"
  | "member_join"
  | "member_leave"
  | "private_message"
  | "unknown";

interface StringField {
  String?: string;
}

function readString(field: StringField | string | undefined): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field.String ?? "";
}

/** 识别 Hook 4.1.8.27 统一回调 payload 类型 */
export function classifyHookCallback(raw: unknown): HookCallbackKind {
  if (!raw || typeof raw !== "object") return "unknown";

  const payload = raw as Record<string, unknown>;

  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return classifyHookCallback(payload.data);
  }

  const messageType = String(
    payload.messageType ?? payload.message_type ?? payload.event ?? payload.eventType ?? "",
  ).toLowerCase();

  if (
    messageType.includes("进群") ||
    messageType.includes("member_join") ||
    messageType.includes("join_group") ||
    messageType.includes("chatroom_member_join")
  ) {
    return "member_join";
  }

  if (
    messageType.includes("退群") ||
    messageType.includes("member_leave") ||
    messageType.includes("leave_group") ||
    messageType.includes("chatroom_member_leave")
  ) {
    return "member_leave";
  }

  const roomId = readString(payload.fromUserName as StringField | string);
  if (roomId.endsWith("@chatroom")) {
    const msgType = String(payload.msgType ?? "");
    if (msgType === "10000" || msgType === "10002") {
      if (messageType.includes("join") || messageType.includes("进群")) return "member_join";
      if (messageType.includes("leave") || messageType.includes("退群")) return "member_leave";
    }
    return "group_message";
  }

  if (payload.real_content !== undefined || payload.content !== undefined) {
    return "private_message";
  }

  return "unknown";
}

export interface RoutedHookCallback {
  kind: HookCallbackKind;
  message?: NormalizedMessage;
  memberJoin?: MemberJoinEvent;
  memberLeave?: MemberLeaveEvent;
}

export function routeHookCallback(raw: unknown): RoutedHookCallback {
  const kind = classifyHookCallback(raw);

  switch (kind) {
    case "group_message": {
      const { normalizeGroupMessage } = awaitImport();
      const message = normalizeGroupMessage(raw);
      return { kind, message: message ?? undefined };
    }
    case "member_join": {
      const { normalizeMemberJoin } = awaitImport();
      const memberJoin = normalizeMemberJoin(raw);
      return { kind, memberJoin: memberJoin ?? undefined };
    }
    case "member_leave": {
      const { normalizeMemberLeave } = awaitImport();
      const memberLeave = normalizeMemberLeave(raw);
      return { kind, memberLeave: memberLeave ?? undefined };
    }
    default:
      return { kind };
  }
}

// 避免循环依赖，延迟导入 normalizer
let cachedNormalizers: {
  normalizeGroupMessage: (raw: unknown) => NormalizedMessage | null;
  normalizeMemberJoin: (raw: unknown) => MemberJoinEvent | null;
  normalizeMemberLeave: (raw: unknown) => MemberLeaveEvent | null;
} | null = null;

function awaitImport() {
  if (!cachedNormalizers) {
    throw new Error("Normalizers not initialized — call initCallbackRouter first");
  }
  return cachedNormalizers;
}

export function initCallbackRouter(normalizers: {
  normalizeGroupMessage: (raw: unknown) => NormalizedMessage | null;
  normalizeMemberJoin: (raw: unknown) => MemberJoinEvent | null;
  normalizeMemberLeave: (raw: unknown) => MemberLeaveEvent | null;
}): void {
  cachedNormalizers = normalizers;
}

/** 同步路由（normalizer 已静态导入时使用） */
export function routeHookCallbackSync(
  raw: unknown,
  normalizers: {
    normalizeGroupMessage: (raw: unknown) => NormalizedMessage | null;
    normalizeMemberJoin: (raw: unknown) => MemberJoinEvent | null;
    normalizeMemberLeave: (raw: unknown) => MemberLeaveEvent | null;
  },
): RoutedHookCallback {
  const kind = classifyHookCallback(raw);

  switch (kind) {
    case "group_message":
      return { kind, message: normalizers.normalizeGroupMessage(raw) ?? undefined };
    case "member_join":
      return { kind, memberJoin: normalizers.normalizeMemberJoin(raw) ?? undefined };
    case "member_leave":
      return { kind, memberLeave: normalizers.normalizeMemberLeave(raw) ?? undefined };
    default:
      return { kind };
  }
}
