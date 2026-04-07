import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import pg from "pg";
import crypto from "crypto";
import { type User, type InsertUser, type Session, type InsertSession, users, sessions } from "@shared/schema";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

// -- Password hashing using built-in crypto (no extra deps needed) --
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
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { role?: string }): Promise<User>;
  listUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;

  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, updates: SessionUpdate): Promise<Session | undefined>;
  endSession(id: number, outTime: Date): Promise<Session | undefined>;
  getSessionsByDate(date: string): Promise<Session[]>;
  getAllSessions(): Promise<Session[]>;
}

export class DatabaseStorage implements IStorage {
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

  async createSession(insertSession: InsertSession): Promise<Session> {
    const result = await db.insert(sessions).values({
      ...insertSession,
      inTime: new Date(),
    }).returning();
    return result[0];
  }

  async updateSession(id: number, updates: SessionUpdate): Promise<Session | undefined> {
    const result = await db.update(sessions)
      .set(updates)
      .where(eq(sessions.id, id))
      .returning();
    return result[0];
  }

  async endSession(id: number, outTime: Date): Promise<Session | undefined> {
    const result = await db.update(sessions)
      .set({ outTime })
      .where(eq(sessions.id, id))
      .returning();
    return result[0];
  }

  async getSessionsByDate(date: string): Promise<Session[]> {
    return await db.select().from(sessions).where(eq(sessions.date, date));
  }

  async getAllSessions(): Promise<Session[]> {
    return await db.select().from(sessions);
  }
}

export const storage = new DatabaseStorage();

// Seed a default admin user if none exists
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
