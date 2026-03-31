import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import pg from "pg";
import { type User, type InsertUser, type Session, type InsertSession, users, sessions } from "@shared/schema";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  createSession(session: InsertSession): Promise<Session>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const result = await db.insert(sessions).values({
      ...insertSession,
      inTime: new Date(),
    }).returning();
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
