import type { GroupMember, IHookClient } from "@wechathook/shared";
import type { HandleMessageCallback } from "./types.js";

export class CallbackHookClient implements IHookClient {
  readonly callbacks: HandleMessageCallback[] = [];

  constructor(
    private replyAccount: string,
    private roomId: string,
  ) {}

  reset(replyAccount: string, roomId: string): void {
    this.callbacks.length = 0;
    this.replyAccount = replyAccount;
    this.roomId = roomId;
  }

  async sendText(roomId: string, msg: string): Promise<void> {
    this.callbacks.push({
      msg_type: 1,
      acc_wxid: this.replyAccount,
      to_wxid: roomId,
      wxid: roomId,
      content: msg,
    });
  }

  async sendAt(roomId: string, wxids: string, msg: string): Promise<void> {
    const atPrefix = wxids ? `@${wxids} ` : "";
    await this.sendText(roomId, `${atPrefix}${msg}`);
  }

  async kickMember(_roomId: string, _wxid: string): Promise<void> {
    // 萌兔 msg_type 待扩展；当前仅占位
  }

  async getGroupMembers(_roomId: string): Promise<GroupMember[]> {
    return [];
  }
}
