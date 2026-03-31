import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, timestamp, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const customFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  kidName: text("kid_name").notNull(),
  childSocks: text("child_socks").notNull(),
  parentSocks: text("parent_socks"),
  parentsCount: real("parents_count").notNull().default(1),
  hoursOfPlay: real("hours_of_play").notNull(),
  customFields: jsonb("custom_fields").notNull().default(sql`'[]'::jsonb`),
  inTime: timestamp("in_time").notNull().defaultNow(),
  outTime: timestamp("out_time"),
  date: text("date").notNull(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  inTime: true,
  outTime: true,
}).extend({
  customFields: z.array(customFieldSchema).optional().default([]),
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
