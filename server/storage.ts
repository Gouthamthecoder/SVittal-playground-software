import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import pg from "pg";
import crypto from "crypto";
import {
  type User, type InsertUser,
  type Session, type InsertSession,
  type Shop, type InsertShop,
  type UserShop,
  users, sessions, shops, userShops,
} from "@shared/schema";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

// ── Password hashing ─────────────────────────────────────────────────────────
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
}

export interface SessionUpdate {
  kidName?: string;
  hoursOfPlay?: number;
  parentsCount?: number;
  childSocks?: string;
  parentSocks?: string | null;
  customFields?: any[];
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { role?: string }): Promise<User>;
  listUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;

  // Shops
  createShop(shop: InsertShop): Promise<Shop>;
  listShops(): Promise<Shop[]>;
  getShop(id: number): Promise<Shop | undefined>;
  deleteShop(id: number): Promise<void>;

  // User ↔ Shop assignments
  assignUserToShop(userId: string, shopId: number, role?: string): Promise<UserShop>;
  removeUserFromShop(userId: string, shopId: number): Promise<void>;
  getShopsByUser(userId: string): Promise<(Shop & { role: string })[]>;
  getUsersByShop(shopId: number): Promise<(User & { shopRole: string })[]>;

  // Sessions
  createSession(data: InsertSession & { shopId?: number | null }): Promise<Session>;
  updateSession(id: number, updates: SessionUpdate): Promise<Session | undefined>;
  endSession(id: number, outTime: Date): Promise<Session | undefined>;
  getSessionsByDate(date: string, shopId?: number | null): Promise<Session[]>;
  getAllSessions(shopId?: number | null): Promise<Session[]>;
}

export class DatabaseStorage implements IStorage {
  // ── Users ──────────────────────────────────────────────────────────────────
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser & { role?: string }): Promise<User> {
    const result = await db.insert(users).values({
      username: insertUser.username,
      password: insertUser.password,
      role: insertUser.role ?? "staff",
    }).returning();
    return result[0];
  }

  async listUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // ── Shops ──────────────────────────────────────────────────────────────────
  async createShop(shop: InsertShop): Promise<Shop> {
    const result = await db.insert(shops).values(shop).returning();
    return result[0];
  }

  async listShops(): Promise<Shop[]> {
    return await db.select().from(shops);
  }

  async getShop(id: number): Promise<Shop | undefined> {
    const result = await db.select().from(shops).where(eq(shops.id, id));
    return result[0];
  }

  async deleteShop(id: number): Promise<void> {
    await db.delete(shops).where(eq(shops.id, id));
  }

  // ── User ↔ Shop ────────────────────────────────────────────────────────────
  async assignUserToShop(userId: string, shopId: number, role = "staff"): Promise<UserShop> {
    const result = await db
      .insert(userShops)
      .values({ userId, shopId, role })
      .onConflictDoUpdate({ target: [userShops.userId, userShops.shopId], set: { role } })
      .returning();
    return result[0];
  }

  async removeUserFromShop(userId: string, shopId: number): Promise<void> {
    await db.delete(userShops)
      .where(and(eq(userShops.userId, userId), eq(userShops.shopId, shopId)));
  }

  async getShopsByUser(userId: string): Promise<(Shop & { role: string })[]> {
    const rows = await db
      .select({ id: shops.id, name: shops.name, code: shops.code, role: userShops.role })
      .from(userShops)
      .innerJoin(shops, eq(userShops.shopId, shops.id))
      .where(eq(userShops.userId, userId));
    return rows;
  }

  async getUsersByShop(shopId: number): Promise<(User & { shopRole: string })[]> {
    const rows = await db
      .select({
        id: users.id, username: users.username,
        password: users.password, role: users.role,
        shopRole: userShops.role,
      })
      .from(userShops)
      .innerJoin(users, eq(userShops.userId, users.id))
      .where(eq(userShops.shopId, shopId));
    return rows;
  }

  // ── Sessions ───────────────────────────────────────────────────────────────
  async createSession(data: InsertSession & { shopId?: number | null }): Promise<Session> {
    const result = await db.insert(sessions).values({
      ...data,
      inTime: new Date(),
    }).returning();
    return result[0];
  }

  async updateSession(id: number, updates: SessionUpdate): Promise<Session | undefined> {
    const result = await db.update(sessions).set(updates).where(eq(sessions.id, id)).returning();
    return result[0];
  }

  async endSession(id: number, outTime: Date): Promise<Session | undefined> {
    const result = await db.update(sessions).set({ outTime }).where(eq(sessions.id, id)).returning();
    return result[0];
  }

  async getSessionsByDate(date: string, shopId?: number | null): Promise<Session[]> {
    if (shopId != null) {
      return await db.select().from(sessions)
        .where(and(eq(sessions.date, date), eq(sessions.shopId, shopId)));
    }
    return await db.select().from(sessions).where(eq(sessions.date, date));
  }

  async getAllSessions(shopId?: number | null): Promise<Session[]> {
    if (shopId != null) {
      return await db.select().from(sessions).where(eq(sessions.shopId, shopId));
    }
    return await db.select().from(sessions);
  }
}

export const storage = new DatabaseStorage();

// ── Seed helpers ─────────────────────────────────────────────────────────────
export async function seedDefaultAdmin() {
  const existing = await storage.getUserByUsername("admin");
  if (!existing) {
    await storage.createUser({
      username: "admin",
      password: hashPassword("admin123"),
      role: "admin",
    });
    console.log("[auth] Default admin created — username: admin, password: admin123");
  }
}

export async function seedDefaultShop() {
  const existing = await storage.listShops();
  if (existing.length === 0) {
    await storage.createShop({ name: "Main Shop", code: "MAIN" });
    console.log("[shops] Default shop created — Main Shop");
  }
}
