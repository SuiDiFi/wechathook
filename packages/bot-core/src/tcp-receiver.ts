import net from "node:net";
import type { PluginRegistry } from "./plugin-registry.js";
import { createLogger } from "./config.js";
import {
  normalizeGroupMessage,
  normalizeMemberJoin,
  normalizeMemberLeave,
  routeHookCallbackSync,
} from "@wechathook/hook-adapter";

export interface TcpReceiverOptions {
  host?: string;
  port: number;
}

/** Hook 4.1.8.27 TCP 模式接收器（4 字节大端长度头 + JSON 消息体） */
export class TcpReceiver {
  private server: net.Server | null = null;
  private logger = createLogger("tcp-receiver");

  constructor(
    private options: TcpReceiverOptions,
    private registry: PluginRegistry,
  ) {}

  start(): void {
    this.server = net.createServer((socket) => {
      const remote = `${socket.remoteAddress}:${socket.remotePort}`;
      this.logger.info(`TCP client connected: ${remote}`);
      this.handleSocket(socket);
    });

    const host = this.options.host ?? "0.0.0.0";
    this.server.listen(this.options.port, host, () => {
      this.logger.info(`TCP receiver listening on ${host}:${this.options.port}`);
    });

    this.server.on("error", (err) => {
      this.logger.error("TCP server error:", err);
    });
  }

  stop(): void {
    this.server?.close();
    this.server = null;
  }

  private handleSocket(socket: net.Socket): void {
    let buffer = Buffer.alloc(0);

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      while (buffer.length >= 4) {
        const length = buffer.readUInt32BE(0);
        if (length <= 0 || length > 1024 * 1024) {
          this.logger.warn(`Invalid TCP message length: ${length}`);
          socket.destroy();
          return;
        }

        if (buffer.length < 4 + length) return;

        const body = buffer.subarray(4, 4 + length).toString("utf8");
        buffer = buffer.subarray(4 + length);

        void this.dispatchPayload(body);
      }
    });

    socket.on("error", (err) => {
      this.logger.debug("TCP socket error:", err.message);
    });
  }

  private async dispatchPayload(body: string): Promise<void> {
    try {
      const raw = JSON.parse(body) as unknown;
      await this.dispatchRaw(raw);
    } catch (err) {
      this.logger.error("Failed to parse TCP payload:", err);
    }
  }

  private async dispatchRaw(raw: unknown): Promise<void> {
    const routed = routeHookCallbackSync(raw, {
      normalizeGroupMessage,
      normalizeMemberJoin,
      normalizeMemberLeave,
    });

    switch (routed.kind) {
      case "group_message":
        if (routed.message) await this.registry.dispatchMessage(routed.message);
        break;
      case "member_join":
        if (routed.memberJoin) await this.registry.dispatchMemberJoin(routed.memberJoin);
        break;
      case "member_leave":
        if (routed.memberLeave) await this.registry.dispatchMemberLeave(routed.memberLeave);
        break;
      default:
        this.logger.debug(`Ignored TCP callback kind: ${routed.kind}`);
    }
  }
}
