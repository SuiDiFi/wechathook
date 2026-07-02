import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type {
  GameSession,
  IStorage,
  LeaderboardEntry,
  UserRecord,
} from "@wechathook/shared";

export class SqliteStorage implements IStorage {
  private db: Database.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        wxid TEXT PRIMARY KEY,
        nick TEXT NOT NULL DEFAULT '',
        points INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        wxid TEXT NOT NULL,
        checkin_date TEXT NOT NULL,
        streak INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(room_id, wxid, checkin_date)
      );

      CREATE TABLE IF NOT EXISTS plugin_config (
        room_id TEXT NOT NULL,
        plugin_name TEXT NOT NULL,
        config_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (room_id, plugin_name)
      );

      CREATE TABLE IF NOT EXISTS game_sessions (
        room_id TEXT NOT NULL,
        plugin_id TEXT NOT NULL,
        state TEXT NOT NULL,
        data_json TEXT NOT NULL DEFAULT '{}',
        started_at TEXT NOT NULL,
        PRIMARY KEY (room_id, plugin_id)
      );

      CREATE INDEX IF NOT EXISTS idx_checkins_room_wxid ON checkins(room_id, wxid);
      CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC);
    `);
  }

  upsertUser(wxid: string, nick: string): void {
    this.db
      .prepare(
        `INSERT INTO users (wxid, nick, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(wxid) DO UPDATE SET
           nick = excluded.nick,
           updated_at = datetime('now')`,
      )
      .run(wxid, nick);
  }

  getUser(wxid: string): UserRecord | undefined {
    const row = this.db
      .prepare(`SELECT wxid, nick, points, updated_at AS updatedAt FROM users WHERE wxid = ?`)
      .get(wxid) as UserRecord | undefined;
    return row;
  }

  addPoints(wxid: string, points: number): number {
    this.db
      .prepare(`UPDATE users SET points = points + ?, updated_at = datetime('now') WHERE wxid = ?`)
      .run(points, wxid);
    return this.getPoints(wxid);
  }

  getPoints(wxid: string): number {
    const row = this.db.prepare(`SELECT points FROM users WHERE wxid = ?`).get(wxid) as
      | { points: number }
      | undefined;
    return row?.points ?? 0;
  }

  hasCheckedInToday(roomId: string, wxid: string): boolean {
    const today = todayStr();
    const row = this.db
      .prepare(
        `SELECT 1 FROM checkins WHERE room_id = ? AND wxid = ? AND checkin_date = ? LIMIT 1`,
      )
      .get(roomId, wxid, today);
    return Boolean(row);
  }

  checkin(roomId: string, wxid: string): { success: boolean; streak: number; totalPoints: number } {
    const today = todayStr();
    if (this.hasCheckedInToday(roomId, wxid)) {
      return { success: false, streak: this.getStreak(roomId, wxid), totalPoints: this.getPoints(wxid) };
    }

    const yesterday = yesterdayStr();
    const prev = this.db
      .prepare(
        `SELECT streak FROM checkins WHERE room_id = ? AND wxid = ? AND checkin_date = ?`,
      )
      .get(roomId, wxid, yesterday) as { streak: number } | undefined;

    const streak = prev ? prev.streak + 1 : 1;
    const pointsEarned = 10 + Math.min(streak - 1, 6) * 2;

    this.db
      .prepare(
        `INSERT INTO checkins (room_id, wxid, checkin_date, streak) VALUES (?, ?, ?, ?)`,
      )
      .run(roomId, wxid, today, streak);

    const totalPoints = this.addPoints(wxid, pointsEarned);
    return { success: true, streak, totalPoints };
  }

  private getStreak(roomId: string, wxid: string): number {
    const today = todayStr();
    const row = this.db
      .prepare(
        `SELECT streak FROM checkins WHERE room_id = ? AND wxid = ? AND checkin_date = ?`,
      )
      .get(roomId, wxid, today) as { streak: number } | undefined;
    return row?.streak ?? 0;
  }

  getLeaderboard(roomId: string, limit = 10): LeaderboardEntry[] {
    void roomId;
    const rows = this.db
      .prepare(
        `SELECT wxid, nick, points FROM users ORDER BY points DESC LIMIT ?`,
      )
      .all(limit) as LeaderboardEntry[];
    return rows;
  }

  getPluginConfig(roomId: string, pluginName: string): Record<string, unknown> | undefined {
    const row = this.db
      .prepare(
        `SELECT config_json FROM plugin_config WHERE room_id = ? AND plugin_name = ?`,
      )
      .get(roomId, pluginName) as { config_json: string } | undefined;
    if (!row) return undefined;
    return JSON.parse(row.config_json) as Record<string, unknown>;
  }

  setPluginConfig(roomId: string, pluginName: string, config: Record<string, unknown>): void {
    this.db
      .prepare(
        `INSERT INTO plugin_config (room_id, plugin_name, config_json, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(room_id, plugin_name) DO UPDATE SET
           config_json = excluded.config_json,
           updated_at = datetime('now')`,
      )
      .run(roomId, pluginName, JSON.stringify(config));
  }

  getGameSession(roomId: string, pluginId: string): GameSession | undefined {
    const row = this.db
      .prepare(
        `SELECT plugin_id AS pluginId, room_id AS roomId, state, data_json, started_at AS startedAt
         FROM game_sessions WHERE room_id = ? AND plugin_id = ?`,
      )
      .get(roomId, pluginId) as
      | { pluginId: string; roomId: string; state: string; data_json: string; startedAt: string }
      | undefined;

    if (!row) return undefined;
    return {
      pluginId: row.pluginId,
      roomId: row.roomId,
      state: row.state,
      data: JSON.parse(row.data_json) as Record<string, unknown>,
      startedAt: row.startedAt,
    };
  }

  setGameSession(roomId: string, pluginId: string, session: GameSession | null): void {
    if (!session) {
      this.db
        .prepare(`DELETE FROM game_sessions WHERE room_id = ? AND plugin_id = ?`)
        .run(roomId, pluginId);
      return;
    }

    this.db
      .prepare(
        `INSERT INTO game_sessions (room_id, plugin_id, state, data_json, started_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(room_id, plugin_id) DO UPDATE SET
           state = excluded.state,
           data_json = excluded.data_json,
           started_at = excluded.started_at`,
      )
      .run(roomId, pluginId, session.state, JSON.stringify(session.data), session.startedAt);
  }

  close(): void {
    this.db.close();
  }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
