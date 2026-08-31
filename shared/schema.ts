import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, timestamp, jsonb, serial, integer, primaryKey, unique, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("staff"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ── Shops ────────────────────────────────────────────────────────────────────
export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: varchar("code", { length: 20 }),
});

export type Shop = typeof shops.$inferSelect;
export type InsertShop = typeof shops.$inferInsert;

// ── User ↔ Shop assignments (staff role per shop) ────────────────────────────
export const userShops = pgTable("user_shops", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull().default("staff"),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.shopId] }),
}));

export type UserShop = typeof userShops.$inferSelect;

// ── Play sessions ────────────────────────────────────────────────────────────
export const customFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id"),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  customerPlanId: integer("customer_plan_id").references(() => customerPlans.id, { onDelete: "set null" }),
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
  shopId: true,
  customerId: true,
  customerPlanId: true,
}).extend({
  customFields: z.array(customFieldSchema).optional().default([]),
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export const socksInventoryItems = pgTable("socks_inventory_items", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 20 }).notNull(),
  size: varchar("size", { length: 20 }).notNull(),
  quantity: integer("quantity").notNull().default(0),
}, (table) => ({
  shopCategorySizeUnique: unique("socks_inventory_items_shop_category_size_unique").on(
    table.shopId,
    table.category,
    table.size,
  ),
}));

export type SocksInventoryItem = typeof socksInventoryItems.$inferSelect;
export type InsertSocksInventoryItem = typeof socksInventoryItems.$inferInsert;

// ── Customer billing and plans ──────────────────────────────────────────────
export const billingFields = pgTable("billing_fields", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  fieldType: varchar("field_type", { length: 20 }).notNull().default("text"),
  required: boolean("required").notNull().default(false),
  options: jsonb("options").notNull().default(sql`'[]'::jsonb`),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  dateOfBirth: text("date_of_birth"),
  customFields: jsonb("custom_fields").notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  totalHours: real("total_hours").notNull(),
  price: real("price"),
  durationDays: integer("duration_days"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customerPlans = pgTable("customer_plans", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  planId: integer("plan_id").notNull().references(() => plans.id, { onDelete: "restrict" }),
  purchasedHours: real("purchased_hours").notNull(),
  remainingHours: real("remaining_hours").notNull(),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
});

export const customerPlanUsage = pgTable("customer_plan_usage", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  customerPlanId: integer("customer_plan_id").notNull().references(() => customerPlans.id, { onDelete: "cascade" }),
  hoursUsed: real("hours_used").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  customerPlanId: integer("customer_plan_id").notNull().references(() => customerPlans.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  paidAt: timestamp("paid_at").notNull().defaultNow(),
});

export type BillingField = typeof billingFields.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type CustomerPlan = typeof customerPlans.$inferSelect;
export type CustomerPlanUsage = typeof customerPlanUsage.$inferSelect;
export type Payment = typeof payments.$inferSelect;
