import type { GroupMember, IHookClient, Logger } from "@wechathook/shared";

/** 包装 Hook 客户端，发送失败时记录日志而不抛出，避免 webhook 500 */
export class SafeHookClient implements IHookClient {
  constructor(
    private inner: IHookClient,
    private logger: Logger,
  ) {}

  async sendText(roomId: string, msg: string): Promise<void> {
    try {
      await this.inner.sendText(roomId, msg);
    } catch (err) {
      this.logger.error(`sendText failed [${roomId}]:`, err);
    }
  }

  async sendAt(roomId: string, wxids: string, msg: string): Promise<void> {
    try {
      await this.inner.sendAt(roomId, wxids, msg);
    } catch (err) {
      this.logger.error(`sendAt failed [${roomId}]:`, err);
    }
  }

  async kickMember(roomId: string, wxid: string): Promise<void> {
    await this.inner.kickMember(roomId, wxid);
  }

  async getGroupMembers(roomId: string): Promise<GroupMember[]> {
    return this.inner.getGroupMembers(roomId);
  }
}
