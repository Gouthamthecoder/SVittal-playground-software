// load-env.ts
import fs from "fs";
import path from "path";
function parseEnvFile(contents) {
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== void 0) continue;
    let value = line.slice(separatorIndex + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }
  parseEnvFile(fs.readFileSync(envPath, "utf8"));
}
loadEnvFile();

// server/app.ts
import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import { createServer } from "http";

// server/storage.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, asc, desc, ilike, gte, lte } from "drizzle-orm";
import pg from "pg";
import crypto from "crypto";

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, timestamp, jsonb, serial, integer, primaryKey, unique, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("staff")
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: varchar("code", { length: 20 })
});
var userShops = pgTable("user_shops", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull().default("staff")
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.shopId] })
}));
var customFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string()
});
var sessions = pgTable("sessions", {
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
  date: text("date").notNull()
});
var insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  inTime: true,
  outTime: true,
  shopId: true,
  customerId: true,
  customerPlanId: true
}).extend({
  customFields: z.array(customFieldSchema).optional().default([])
});
var socksInventoryItems = pgTable("socks_inventory_items", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 20 }).notNull(),
  size: varchar("size", { length: 20 }).notNull(),
  quantity: integer("quantity").notNull().default(0)
}, (table) => ({
  shopCategorySizeUnique: unique("socks_inventory_items_shop_category_size_unique").on(
    table.shopId,
    table.category,
    table.size
  )
}));
var billingFields = pgTable("billing_fields", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  fieldType: varchar("field_type", { length: 20 }).notNull().default("text"),
  required: boolean("required").notNull().default(false),
  options: jsonb("options").notNull().default(sql`'[]'::jsonb`),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true)
});
var customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  dateOfBirth: text("date_of_birth"),
  customFields: jsonb("custom_fields").notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  totalHours: real("total_hours").notNull(),
  price: real("price"),
  durationDays: integer("duration_days"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var customerPlans = pgTable("customer_plans", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  planId: integer("plan_id").notNull().references(() => plans.id, { onDelete: "restrict" }),
  purchasedHours: real("purchased_hours").notNull(),
  remainingHours: real("remaining_hours").notNull(),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date"),
  status: varchar("status", { length: 20 }).notNull().default("active")
});
var customerPlanUsage = pgTable("customer_plan_usage", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  customerPlanId: integer("customer_plan_id").notNull().references(() => customerPlans.id, { onDelete: "cascade" }),
  hoursUsed: real("hours_used").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  customerId: integer("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  customerPlanId: integer("customer_plan_id").notNull().references(() => customerPlans.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  paidAt: timestamp("paid_at").notNull().defaultNow()
});

// server/storage.ts
var { Pool } = pg;
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool });
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
}
var DatabaseStorage = class {
  // ── Users ──────────────────────────────────────────────────────────────────
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }
  async getUserByUsername(username) {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }
  async createUser(insertUser) {
    const result = await db.insert(users).values({
      username: insertUser.username,
      password: insertUser.password,
      role: insertUser.role ?? "staff"
    }).returning();
    return result[0];
  }
  async listUsers() {
    return await db.select().from(users);
  }
  async deleteUser(id) {
    await db.delete(users).where(eq(users.id, id));
  }
  // ── Shops ──────────────────────────────────────────────────────────────────
  async createShop(shop) {
    const result = await db.insert(shops).values(shop).returning();
    return result[0];
  }
  async listShops() {
    return await db.select().from(shops);
  }
  async getShop(id) {
    const result = await db.select().from(shops).where(eq(shops.id, id));
    return result[0];
  }
  async deleteShop(id) {
    await db.delete(shops).where(eq(shops.id, id));
  }
  // ── User ↔ Shop ────────────────────────────────────────────────────────────
  async assignUserToShop(userId, shopId, role = "staff") {
    const result = await db.insert(userShops).values({ userId, shopId, role }).onConflictDoUpdate({ target: [userShops.userId, userShops.shopId], set: { role } }).returning();
    return result[0];
  }
  async removeUserFromShop(userId, shopId) {
    await db.delete(userShops).where(and(eq(userShops.userId, userId), eq(userShops.shopId, shopId)));
  }
  async getShopsByUser(userId) {
    const rows = await db.select({ id: shops.id, name: shops.name, code: shops.code, role: userShops.role }).from(userShops).innerJoin(shops, eq(userShops.shopId, shops.id)).where(eq(userShops.userId, userId));
    return rows;
  }
  async getUsersByShop(shopId) {
    const rows = await db.select({
      id: users.id,
      username: users.username,
      password: users.password,
      role: users.role,
      shopRole: userShops.role
    }).from(userShops).innerJoin(users, eq(userShops.userId, users.id)).where(eq(userShops.shopId, shopId));
    return rows;
  }
  // ── Socks inventory ───────────────────────────────────────────────────────
  async listSocksInventory(shopId) {
    return await db.select().from(socksInventoryItems).where(eq(socksInventoryItems.shopId, shopId));
  }
  async replaceSocksInventory(shopId, items) {
    await db.delete(socksInventoryItems).where(eq(socksInventoryItems.shopId, shopId));
    if (items.length === 0) {
      return [];
    }
    return await db.insert(socksInventoryItems).values(items.map((item) => ({ ...item, shopId }))).returning();
  }
  // ── Customer billing ─────────────────────────────────────────────────────
  async listBillingFields(shopId) {
    return db.select().from(billingFields).where(eq(billingFields.shopId, shopId)).orderBy(asc(billingFields.sortOrder), asc(billingFields.id));
  }
  async createBillingField(shopId, input) {
    const result = await db.insert(billingFields).values({
      shopId,
      label: input.label,
      fieldType: input.fieldType,
      required: input.required ?? false,
      options: input.options ?? [],
      sortOrder: input.sortOrder ?? 0,
      active: input.active ?? true
    }).returning();
    return result[0];
  }
  async updateBillingField(shopId, id, input) {
    const result = await db.update(billingFields).set(input).where(and(eq(billingFields.shopId, shopId), eq(billingFields.id, id))).returning();
    return result[0];
  }
  async deleteBillingField(shopId, id) {
    await db.delete(billingFields).where(and(eq(billingFields.shopId, shopId), eq(billingFields.id, id)));
  }
  async listCustomers(shopId, phoneSearch) {
    const where = phoneSearch ? and(eq(customers.shopId, shopId), ilike(customers.phone, `%${phoneSearch}%`)) : eq(customers.shopId, shopId);
    return db.select().from(customers).where(where).orderBy(desc(customers.createdAt)).limit(phoneSearch ? 25 : 100);
  }
  async getCustomer(shopId, id) {
    const result = await db.select().from(customers).where(and(eq(customers.shopId, shopId), eq(customers.id, id))).limit(1);
    return result[0];
  }
  async createCustomer(shopId, input) {
    const result = await db.insert(customers).values({
      shopId,
      name: input.name,
      phone: input.phone,
      dateOfBirth: input.dateOfBirth ?? null,
      customFields: input.customFields ?? []
    }).returning();
    return result[0];
  }
  async updateCustomer(shopId, id, input) {
    const result = await db.update(customers).set(input).where(and(eq(customers.shopId, shopId), eq(customers.id, id))).returning();
    return result[0];
  }
  // ── Plans and balances ───────────────────────────────────────────────────
  async listPlans(shopId) {
    return db.select().from(plans).where(eq(plans.shopId, shopId)).orderBy(desc(plans.createdAt));
  }
  async createPlan(shopId, input) {
    const result = await db.insert(plans).values({ shopId, ...input }).returning();
    return result[0];
  }
  async updatePlan(shopId, id, input) {
    const result = await db.update(plans).set(input).where(and(eq(plans.shopId, shopId), eq(plans.id, id))).returning();
    return result[0];
  }
  async deletePlan(shopId, id) {
    await db.delete(plans).where(and(eq(plans.shopId, shopId), eq(plans.id, id)));
  }
  async listCustomerPlans(shopId) {
    const rows = await db.select({ customerPlan: customerPlans, customer: customers, plan: plans }).from(customerPlans).innerJoin(customers, eq(customerPlans.customerId, customers.id)).innerJoin(plans, eq(customerPlans.planId, plans.id)).where(eq(customerPlans.shopId, shopId)).orderBy(desc(customerPlans.startDate));
    return rows.map((row) => ({ ...row.customerPlan, customer: row.customer, plan: row.plan }));
  }
  async getActiveCustomerPlan(shopId, customerId) {
    const rows = await db.select({ customerPlan: customerPlans, customer: customers, plan: plans }).from(customerPlans).innerJoin(customers, eq(customerPlans.customerId, customers.id)).innerJoin(plans, eq(customerPlans.planId, plans.id)).where(and(
      eq(customerPlans.shopId, shopId),
      eq(customerPlans.customerId, customerId),
      eq(customerPlans.status, "active")
    )).orderBy(desc(customerPlans.startDate)).limit(1);
    return rows[0] ? { ...rows[0].customerPlan, customer: rows[0].customer, plan: rows[0].plan } : void 0;
  }
  async assignPlan(shopId, customerId, planId) {
    const [customer, plan] = await Promise.all([
      db.select().from(customers).where(and(eq(customers.id, customerId), eq(customers.shopId, shopId))),
      db.select().from(plans).where(and(eq(plans.id, planId), eq(plans.shopId, shopId), eq(plans.active, true)))
    ]);
    if (!customer[0]) throw new Error("Customer not found");
    if (!plan[0]) throw new Error("Plan not found or inactive");
    const endDate = plan[0].durationDays ? new Date(Date.now() + plan[0].durationDays * 864e5) : null;
    const result = await db.insert(customerPlans).values({
      shopId,
      customerId,
      planId,
      purchasedHours: plan[0].totalHours,
      remainingHours: plan[0].totalHours,
      endDate
    }).returning();
    return result[0];
  }
  async assignPlanWithPayment(shopId, customerId, planId, paymentMethod) {
    return db.transaction(async (tx) => {
      const rows = await tx.select({ customer: customers, plan: plans }).from(customers).innerJoin(plans, and(eq(plans.shopId, customers.shopId), eq(plans.id, planId))).where(and(eq(customers.id, customerId), eq(customers.shopId, shopId), eq(plans.active, true))).limit(1);
      if (!rows[0]) throw new Error("Customer or active plan not found");
      if (rows[0].plan.price === null || rows[0].plan.price <= 0) throw new Error("This plan needs a payment amount before it can be assigned");
      const activePlans = await tx.select().from(customerPlans).where(and(
        eq(customerPlans.shopId, shopId),
        eq(customerPlans.customerId, customerId),
        eq(customerPlans.status, "active")
      ));
      const carriedHours = activePlans.reduce((total, existingPlan) => total + existingPlan.remainingHours, 0);
      for (const existingPlan of activePlans) {
        await tx.update(customerPlans).set({ status: "upgraded" }).where(eq(customerPlans.id, existingPlan.id));
      }
      const endDate = rows[0].plan.durationDays ? new Date(Date.now() + rows[0].plan.durationDays * 864e5) : null;
      const combinedHours = carriedHours + rows[0].plan.totalHours;
      const createdPlan = await tx.insert(customerPlans).values({
        shopId,
        customerId,
        planId,
        purchasedHours: combinedHours,
        remainingHours: combinedHours,
        endDate
      }).returning();
      const createdPayment = await tx.insert(payments).values({
        shopId,
        customerId,
        customerPlanId: createdPlan[0].id,
        amount: rows[0].plan.price,
        paymentMethod
      }).returning();
      return {
        customerPlan: createdPlan[0],
        payment: { ...createdPayment[0], customer: rows[0].customer, plan: rows[0].plan }
      };
    });
  }
  async upgradePlan(shopId, customerPlanId, planId) {
    const current = await db.select().from(customerPlans).where(and(
      eq(customerPlans.id, customerPlanId),
      eq(customerPlans.shopId, shopId),
      eq(customerPlans.status, "active")
    ));
    if (!current[0]) throw new Error("Active customer plan not found");
    const nextPlan = await db.select().from(plans).where(and(eq(plans.id, planId), eq(plans.shopId, shopId), eq(plans.active, true)));
    if (!nextPlan[0]) throw new Error("Plan not found or inactive");
    const endDate = nextPlan[0].durationDays ? new Date(Date.now() + nextPlan[0].durationDays * 864e5) : null;
    const result = await db.transaction(async (tx) => {
      await tx.update(customerPlans).set({ status: "upgraded" }).where(eq(customerPlans.id, customerPlanId));
      return tx.insert(customerPlans).values({
        shopId,
        customerId: current[0].customerId,
        planId,
        purchasedHours: current[0].remainingHours + nextPlan[0].totalHours,
        remainingHours: current[0].remainingHours + nextPlan[0].totalHours,
        endDate
      }).returning();
    });
    return result[0];
  }
  async consumePlanHours(shopId, customerPlanId, hoursUsed, note) {
    const current = await db.select().from(customerPlans).where(and(
      eq(customerPlans.id, customerPlanId),
      eq(customerPlans.shopId, shopId),
      eq(customerPlans.status, "active")
    ));
    if (!current[0]) throw new Error("Active customer plan not found");
    if (hoursUsed > current[0].remainingHours) throw new Error("Usage cannot be greater than the available balance");
    const result = await db.transaction(async (tx) => {
      await tx.insert(customerPlanUsage).values({ shopId, customerPlanId, hoursUsed, note: note ?? null });
      return tx.update(customerPlans).set({ remainingHours: current[0].remainingHours - hoursUsed }).where(eq(customerPlans.id, customerPlanId)).returning();
    });
    return result[0];
  }
  async createSessionWithCustomerPlan(data, shopId, customerId) {
    return db.transaction(async (tx) => {
      const customer = await tx.select().from(customers).where(and(
        eq(customers.id, customerId),
        eq(customers.shopId, shopId)
      ));
      if (!customer[0]) throw new Error("Customer not found for this shop");
      const activePlans = await tx.select().from(customerPlans).where(and(
        eq(customerPlans.customerId, customerId),
        eq(customerPlans.shopId, shopId),
        eq(customerPlans.status, "active")
      )).orderBy(desc(customerPlans.startDate));
      const activePlan = activePlans[0];
      if (!activePlan) throw new Error("This customer does not have an active plan");
      if (data.hoursOfPlay > activePlan.remainingHours) {
        throw new Error(`Only ${activePlan.remainingHours.toFixed(2)} play hours are available for this customer`);
      }
      const created = await tx.insert(sessions).values({
        ...data,
        shopId,
        customerId,
        customerPlanId: activePlan.id,
        inTime: /* @__PURE__ */ new Date()
      }).returning();
      await tx.insert(customerPlanUsage).values({
        shopId,
        customerPlanId: activePlan.id,
        hoursUsed: data.hoursOfPlay,
        note: `Dashboard play session #${created[0].id}`
      });
      await tx.update(customerPlans).set({
        remainingHours: activePlan.remainingHours - data.hoursOfPlay
      }).where(eq(customerPlans.id, activePlan.id));
      return created[0];
    });
  }
  async createPayment(shopId, input) {
    const planRows = await db.select({ customerPlan: customerPlans, customer: customers, plan: plans }).from(customerPlans).innerJoin(customers, eq(customerPlans.customerId, customers.id)).innerJoin(plans, eq(customerPlans.planId, plans.id)).where(and(eq(customerPlans.id, input.customerPlanId), eq(customerPlans.shopId, shopId))).limit(1);
    if (!planRows[0]) throw new Error("Customer plan not found");
    const created = await db.insert(payments).values({
      shopId,
      customerId: planRows[0].customer.id,
      customerPlanId: input.customerPlanId,
      amount: input.amount,
      paymentMethod: input.paymentMethod
    }).returning();
    return { ...created[0], customer: planRows[0].customer, plan: planRows[0].plan };
  }
  async getReports(shopId, from, to) {
    const [customerRows, planRows, paymentRows] = await Promise.all([
      db.select().from(customers).where(and(eq(customers.shopId, shopId), gte(customers.createdAt, from), lte(customers.createdAt, to))).orderBy(desc(customers.createdAt)),
      db.select({ customerPlan: customerPlans, customer: customers, plan: plans }).from(customerPlans).innerJoin(customers, eq(customerPlans.customerId, customers.id)).innerJoin(plans, eq(customerPlans.planId, plans.id)).where(and(eq(customerPlans.shopId, shopId), gte(customerPlans.startDate, from), lte(customerPlans.startDate, to))).orderBy(desc(customerPlans.startDate)),
      db.select({ payment: payments, customer: customers, plan: plans }).from(payments).innerJoin(customers, eq(payments.customerId, customers.id)).innerJoin(customerPlans, eq(payments.customerPlanId, customerPlans.id)).innerJoin(plans, eq(customerPlans.planId, plans.id)).where(and(eq(payments.shopId, shopId), gte(payments.paidAt, from), lte(payments.paidAt, to))).orderBy(desc(payments.paidAt))
    ]);
    return {
      customers: customerRows,
      customerPlans: planRows.map((row) => ({ ...row.customerPlan, customer: row.customer, plan: row.plan })),
      payments: paymentRows.map((row) => ({ ...row.payment, customer: row.customer, plan: row.plan }))
    };
  }
  // ── Sessions ───────────────────────────────────────────────────────────────
  async createSession(data) {
    const result = await db.insert(sessions).values({
      ...data,
      inTime: /* @__PURE__ */ new Date()
    }).returning();
    return result[0];
  }
  async updateSession(id, updates) {
    const result = await db.update(sessions).set(updates).where(eq(sessions.id, id)).returning();
    return result[0];
  }
  async endSession(id, outTime) {
    const result = await db.update(sessions).set({ outTime }).where(eq(sessions.id, id)).returning();
    return result[0];
  }
  async getSessionsByDate(date, shopId) {
    if (shopId != null) {
      return await db.select().from(sessions).where(and(eq(sessions.date, date), eq(sessions.shopId, shopId)));
    }
    return await db.select().from(sessions).where(eq(sessions.date, date));
  }
  async getAllSessions(shopId) {
    if (shopId != null) {
      return await db.select().from(sessions).where(eq(sessions.shopId, shopId));
    }
    return await db.select().from(sessions);
  }
};
var storage = new DatabaseStorage();
async function seedDefaultAdmin(password, username = "admin") {
  const existing = await storage.getUserByUsername(username);
  if (!existing) {
    await storage.createUser({
      username,
      password: hashPassword(password),
      role: "admin"
    });
    console.log(`[auth] Default admin created for ${username}`);
  }
}
async function seedDefaultShop() {
  const existing = await storage.listShops();
  if (existing.length === 0) {
    await storage.createShop({ name: "Main Shop", code: "MAIN" });
    console.log("[shops] Default shop created \u2014 Main Shop");
  }
}

// server/routes.ts
import { z as z2 } from "zod";
var updateSessionSchema = z2.object({
  kidName: z2.string().min(1).optional(),
  hoursOfPlay: z2.number().positive().optional(),
  parentsCount: z2.number().min(0).optional(),
  childSocks: z2.string().min(1).optional(),
  parentSocks: z2.string().nullable().optional(),
  customFields: z2.array(z2.object({ id: z2.string(), label: z2.string(), value: z2.string() })).optional()
});
function getRouteParam(value) {
  return Array.isArray(value) ? value[0] : value;
}
function normalizeSockSize(value) {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : void 0;
}
function normalizeInventoryCategory(value) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return void 0;
  if (["child", "kid", "kids", "children"].includes(normalized)) return "child";
  if (["parent", "adult", "adults"].includes(normalized)) return "parent";
  return void 0;
}
function splitParentSocks(value) {
  if (!value) return [];
  return value.split(" | ").map((item) => normalizeSockSize(item)).filter((item) => Boolean(item));
}
function buildUsageMap(childSocks, parentSocks) {
  const usage = /* @__PURE__ */ new Map();
  const add = (category, size) => {
    if (!size) return;
    const key = `${category}:${size}`;
    usage.set(key, (usage.get(key) ?? 0) + 1);
  };
  add("child", normalizeSockSize(childSocks));
  for (const sock of splitParentSocks(parentSocks)) {
    add("parent", sock);
  }
  return usage;
}
function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}
function parseInventoryCsv(csvText) {
  const lines = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new Error("Inventory CSV must include a header row and at least one data row");
  }
  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const categoryIndex = headers.findIndex((header) => ["category", "type"].includes(header));
  const sizeIndex = headers.findIndex((header) => header === "size");
  const quantityIndex = headers.findIndex((header) => ["quantity", "count", "stock"].includes(header));
  if (categoryIndex === -1 || sizeIndex === -1 || quantityIndex === -1) {
    throw new Error("Inventory CSV must contain category/type, size, and quantity columns");
  }
  const merged = /* @__PURE__ */ new Map();
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const values = parseCsvLine(lines[lineIndex]);
    const category = normalizeInventoryCategory(values[categoryIndex]);
    const size = normalizeSockSize(values[sizeIndex]);
    const quantity = Number.parseInt((values[quantityIndex] ?? "").trim(), 10);
    if (!category || !size || Number.isNaN(quantity) || quantity < 0) {
      throw new Error(`Invalid inventory row at line ${lineIndex + 1}`);
    }
    const key = `${category}:${size}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += quantity;
    } else {
      merged.set(key, { category, size, quantity });
    }
  }
  return Array.from(merged.values());
}
async function getInventoryAvailability(shopId, excludeSessionId) {
  const [inventory, sessions2] = await Promise.all([
    storage.listSocksInventory(shopId),
    storage.getAllSessions(shopId)
  ]);
  const initialMap = /* @__PURE__ */ new Map();
  for (const item of inventory) {
    const key = `${item.category}:${item.size}`;
    initialMap.set(key, (initialMap.get(key) ?? 0) + item.quantity);
  }
  const usedMap = /* @__PURE__ */ new Map();
  for (const session2 of sessions2) {
    if (excludeSessionId && session2.id === excludeSessionId) continue;
    const usage = buildUsageMap(session2.childSocks, session2.parentSocks);
    for (const [key, quantity] of Array.from(usage.entries())) {
      usedMap.set(key, (usedMap.get(key) ?? 0) + quantity);
    }
  }
  const allKeys = /* @__PURE__ */ new Set([...Array.from(initialMap.keys()), ...Array.from(usedMap.keys())]);
  return Array.from(allKeys).map((key) => {
    const [category, size] = key.split(":");
    const initialQuantity = initialMap.get(key) ?? 0;
    const usedQuantity = usedMap.get(key) ?? 0;
    return {
      category,
      size,
      initialQuantity,
      usedQuantity,
      availableQuantity: initialQuantity - usedQuantity
    };
  }).sort((a, b) => a.category.localeCompare(b.category) || a.size.localeCompare(b.size));
}
async function ensureInventoryAvailability(shopId, childSocks, parentSocks, excludeSessionId) {
  if (!shopId) {
    return;
  }
  const requestedUsage = buildUsageMap(childSocks, parentSocks);
  if (requestedUsage.size === 0) {
    return;
  }
  const availability = await getInventoryAvailability(shopId, excludeSessionId);
  const availabilityMap = new Map(
    availability.map((item) => [`${item.category}:${item.size}`, item.availableQuantity])
  );
  for (const [key, quantity] of Array.from(requestedUsage.entries())) {
    const availableQuantity = availabilityMap.get(key) ?? 0;
    if (quantity > availableQuantity) {
      const [category, size] = key.split(":");
      throw new Error(`Not enough ${category} socks available for size ${size}`);
    }
  }
}
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
  if (req.session.userRole !== "admin") return res.status(403).json({ message: "Forbidden \u2014 admin access required" });
  next();
}
async function registerRoutes(httpServer2, app2) {
  const billingFieldSchema = z2.object({
    label: z2.string().trim().min(1).max(100),
    fieldType: z2.enum(["text", "number", "date", "select"]).default("text"),
    required: z2.boolean().optional(),
    options: z2.array(z2.string().trim().min(1).max(100)).optional(),
    sortOrder: z2.number().int().min(0).optional(),
    active: z2.boolean().optional()
  });
  const customerSchema = z2.object({
    name: z2.string().trim().min(1).max(150),
    phone: z2.string().trim().min(3).max(30),
    dateOfBirth: z2.string().date().nullable().optional(),
    customFields: z2.array(z2.object({ id: z2.string(), label: z2.string(), value: z2.string() })).optional()
  });
  const planSchema = z2.object({
    name: z2.string().trim().min(1).max(100),
    description: z2.string().trim().max(500).nullable().optional(),
    totalHours: z2.number().positive().max(1e4),
    price: z2.number().positive().max(1e7),
    durationDays: z2.number().int().positive().max(3650).nullable().optional(),
    active: z2.boolean().optional()
  });
  const assignmentSchema = z2.object({ customerId: z2.number().int().positive(), planId: z2.number().int().positive() });
  const upgradeSchema = z2.object({ planId: z2.number().int().positive() });
  const consumeSchema = z2.object({ hoursUsed: z2.number().positive().max(1e4), note: z2.string().trim().max(500).nullable().optional() });
  const createSessionSchema = insertSessionSchema.extend({ customerId: z2.number().int().positive() });
  const paymentSchema = z2.object({
    customerPlanId: z2.number().int().positive(),
    amount: z2.number().positive().max(1e7),
    paymentMethod: z2.enum(["cash", "card", "upi"])
  });
  const planPurchaseSchema = z2.object({
    customerId: z2.number().int().positive(),
    planId: z2.number().int().positive(),
    paymentMethod: z2.enum(["cash", "card", "upi"])
  });
  function currentShopId(req) {
    return req.session.shopId ?? void 0;
  }
  app2.post("/api/auth/prelogin", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ message: "Username and password required" });
      const user = await storage.getUserByUsername(username.trim().toLowerCase());
      if (!user || !verifyPassword(password, user.password)) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      let shopList;
      if (user.role === "admin") {
        shopList = (await storage.listShops()).map((s) => ({ ...s, role: "admin" }));
      } else {
        shopList = await storage.getShopsByUser(user.id);
      }
      return res.json({ role: user.role, shops: shopList });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password, shopId } = req.body;
      if (!username || !password) return res.status(400).json({ message: "Username and password required" });
      if (!shopId) return res.status(400).json({ message: "Shop selection required" });
      const user = await storage.getUserByUsername(username.trim().toLowerCase());
      if (!user || !verifyPassword(password, user.password)) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      const shop = await storage.getShop(Number(shopId));
      if (!shop) return res.status(400).json({ message: "Invalid shop" });
      if (user.role !== "admin") {
        const userShops2 = await storage.getShopsByUser(user.id);
        const hasAccess = userShops2.some((s) => s.id === shop.id);
        if (!hasAccess) return res.status(403).json({ message: "You don't have access to this shop" });
      }
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.username = user.username;
      req.session.shopId = shop.id;
      req.session.shopName = shop.name;
      return res.json({ id: user.id, username: user.username, role: user.role, shopId: shop.id, shopName: shop.name });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.patch("/api/auth/shop", requireAuth, async (req, res) => {
    try {
      const { shopId } = req.body;
      if (!shopId) return res.status(400).json({ message: "shopId required" });
      const shop = await storage.getShop(Number(shopId));
      if (!shop) return res.status(400).json({ message: "Invalid shop" });
      if (req.session.userRole !== "admin") {
        const userShops2 = await storage.getShopsByUser(req.session.userId);
        if (!userShops2.some((s) => s.id === shop.id)) {
          return res.status(403).json({ message: "You don't have access to this shop" });
        }
      }
      req.session.shopId = shop.id;
      req.session.shopName = shop.name;
      return res.json({ shopId: shop.id, shopName: shop.name });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out" });
    });
  });
  app2.get("/api/auth/me", (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
    return res.json({
      id: req.session.userId,
      username: req.session.username,
      role: req.session.userRole,
      shopId: req.session.shopId ?? null,
      shopName: req.session.shopName ?? null
    });
  });
  app2.get("/api/shops", async (_req, res) => {
    try {
      return res.json(await storage.listShops());
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.get("/api/shops/:id/socks-inventory", requireAdmin, async (req, res) => {
    try {
      const rawShopId = getRouteParam(req.params.id);
      const shopId = Number.parseInt(rawShopId ?? "", 10);
      if (Number.isNaN(shopId)) return res.status(400).json({ message: "Invalid shop ID" });
      const shop = await storage.getShop(shopId);
      if (!shop) return res.status(404).json({ message: "Shop not found" });
      return res.json(await getInventoryAvailability(shopId));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.post("/api/shops/:id/socks-inventory/import", requireAdmin, async (req, res) => {
    try {
      const rawShopId = getRouteParam(req.params.id);
      const shopId = Number.parseInt(rawShopId ?? "", 10);
      if (Number.isNaN(shopId)) return res.status(400).json({ message: "Invalid shop ID" });
      const shop = await storage.getShop(shopId);
      if (!shop) return res.status(404).json({ message: "Shop not found" });
      const csvText = typeof req.body?.csvText === "string" ? req.body.csvText : "";
      const items = parseInventoryCsv(csvText);
      await storage.replaceSocksInventory(shopId, items);
      return res.json({
        message: "Inventory imported successfully",
        items: await getInventoryAvailability(shopId)
      });
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  });
  app2.get("/api/shops/:id/socks-inventory/export", requireAdmin, async (req, res) => {
    try {
      const rawShopId = getRouteParam(req.params.id);
      const shopId = Number.parseInt(rawShopId ?? "", 10);
      if (Number.isNaN(shopId)) return res.status(400).json({ message: "Invalid shop ID" });
      const shop = await storage.getShop(shopId);
      if (!shop) return res.status(404).json({ message: "Shop not found" });
      const items = await getInventoryAvailability(shopId);
      const csv = [
        "category,size,initial_quantity,used_quantity,available_quantity",
        ...items.map((item) => [
          item.category,
          item.size,
          item.initialQuantity,
          item.usedQuantity,
          item.availableQuantity
        ].join(","))
      ].join("\n");
      const safeShopName = shop.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="socks-inventory-${safeShopName || shop.id}.csv"`);
      return res.send(csv);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  const createShopSchema = z2.object({
    name: z2.string().min(1).max(100),
    code: z2.string().max(20).optional()
  });
  app2.post("/api/shops", requireAdmin, async (req, res) => {
    try {
      const parsed = createShopSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      const shop = await storage.createShop({ name: parsed.data.name, code: parsed.data.code ?? null });
      return res.status(201).json(shop);
    } catch (err) {
      if (err.message?.includes("unique")) return res.status(409).json({ message: "Shop name already exists" });
      return res.status(500).json({ message: err.message });
    }
  });
  app2.delete("/api/shops/:id", requireAdmin, async (req, res) => {
    try {
      const rawId = getRouteParam(req.params.id);
      const id = parseInt(rawId ?? "", 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid shop ID" });
      await storage.deleteShop(id);
      return res.json({ message: "Shop deleted" });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.get("/api/shops/:id/users", requireAdmin, async (req, res) => {
    try {
      const rawId = getRouteParam(req.params.id);
      const id = parseInt(rawId ?? "", 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid shop ID" });
      const result = await storage.getUsersByShop(id);
      return res.json(result.map((u) => ({ id: u.id, username: u.username, role: u.role, shopRole: u.shopRole })));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  const assignUserSchema = z2.object({
    userId: z2.string(),
    role: z2.enum(["admin", "staff"]).default("staff")
  });
  app2.post("/api/shops/:id/users", requireAdmin, async (req, res) => {
    try {
      const rawShopId = getRouteParam(req.params.id);
      const shopId = parseInt(rawShopId ?? "", 10);
      if (isNaN(shopId)) return res.status(400).json({ message: "Invalid shop ID" });
      const parsed = assignUserSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data" });
      const shop = await storage.getShop(shopId);
      if (!shop) return res.status(404).json({ message: "Shop not found" });
      const user = await storage.getUser(parsed.data.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      await storage.assignUserToShop(parsed.data.userId, shopId, parsed.data.role);
      return res.json({ message: "User assigned to shop" });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.delete("/api/shops/:id/users/:userId", requireAdmin, async (req, res) => {
    try {
      const rawShopId = getRouteParam(req.params.id);
      const shopId = parseInt(rawShopId ?? "", 10);
      const userId = getRouteParam(req.params.userId);
      if (isNaN(shopId)) return res.status(400).json({ message: "Invalid shop ID" });
      if (!userId) return res.status(400).json({ message: "Invalid user ID" });
      await storage.removeUserFromShop(userId, shopId);
      return res.json({ message: "User removed from shop" });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.get("/api/users/:id/shops", requireAdmin, async (req, res) => {
    try {
      const userId = getRouteParam(req.params.id);
      if (!userId) return res.status(400).json({ message: "Invalid user ID" });
      const shops2 = await storage.getShopsByUser(userId);
      return res.json(shops2);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  const createUserSchema = z2.object({
    username: z2.string().min(2).max(50),
    password: z2.string().min(10).max(128),
    role: z2.enum(["admin", "staff"]).default("staff")
  });
  app2.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.listUsers();
      return res.json(allUsers.map((u) => ({ id: u.id, username: u.username, role: u.role })));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      const existing = await storage.getUserByUsername(parsed.data.username.toLowerCase());
      if (existing) return res.status(409).json({ message: "Username already taken" });
      const user = await storage.createUser({
        username: parsed.data.username.trim().toLowerCase(),
        password: hashPassword(parsed.data.password),
        role: parsed.data.role
      });
      return res.status(201).json({ id: user.id, username: user.username, role: user.role });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const id = getRouteParam(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid user ID" });
      if (id === req.session.userId) return res.status(400).json({ message: "Cannot delete your own account" });
      await storage.deleteUser(id);
      return res.json({ message: "User deleted" });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.get("/api/billing/fields", requireAuth, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      if (!shopId) return res.status(400).json({ message: "Select a shop first" });
      return res.json(await storage.listBillingFields(shopId));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.post("/api/billing/fields", requireAdmin, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      if (!shopId) return res.status(400).json({ message: "Select a shop first" });
      const parsed = billingFieldSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid billing field", errors: parsed.error.flatten() });
      return res.status(201).json(await storage.createBillingField(shopId, parsed.data));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.patch("/api/billing/fields/:id", requireAdmin, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      const id = Number.parseInt(getRouteParam(req.params.id) ?? "", 10);
      if (!shopId || Number.isNaN(id)) return res.status(400).json({ message: "Invalid request" });
      const parsed = billingFieldSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid billing field" });
      const field = await storage.updateBillingField(shopId, id, parsed.data);
      if (!field) return res.status(404).json({ message: "Billing field not found" });
      return res.json(field);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.delete("/api/billing/fields/:id", requireAdmin, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      const id = Number.parseInt(getRouteParam(req.params.id) ?? "", 10);
      if (!shopId || Number.isNaN(id)) return res.status(400).json({ message: "Invalid request" });
      await storage.deleteBillingField(shopId, id);
      return res.json({ message: "Billing field deleted" });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.get("/api/customers", requireAuth, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      if (!shopId) return res.status(400).json({ message: "Select a shop first" });
      const phone = typeof req.query.phone === "string" ? req.query.phone.trim() : void 0;
      return res.json(await storage.listCustomers(shopId, phone));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.get("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      const id = Number.parseInt(getRouteParam(req.params.id) ?? "", 10);
      if (!shopId || Number.isNaN(id)) return res.status(400).json({ message: "Enter a valid customer ID" });
      const customer = await storage.getCustomer(shopId, id);
      if (!customer) return res.status(404).json({ message: "Customer not found" });
      return res.json(customer);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.post("/api/customers", requireAuth, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      if (!shopId) return res.status(400).json({ message: "Select a shop first" });
      const parsed = customerSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid customer details", errors: parsed.error.flatten() });
      return res.status(201).json(await storage.createCustomer(shopId, parsed.data));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.patch("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      const id = Number.parseInt(getRouteParam(req.params.id) ?? "", 10);
      if (!shopId || Number.isNaN(id)) return res.status(400).json({ message: "Invalid request" });
      const parsed = customerSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid customer details" });
      const customer = await storage.updateCustomer(shopId, id, parsed.data);
      if (!customer) return res.status(404).json({ message: "Customer not found" });
      return res.json(customer);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.get("/api/plans", requireAuth, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      if (!shopId) return res.status(400).json({ message: "Select a shop first" });
      return res.json(await storage.listPlans(shopId));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.post("/api/plans", requireAdmin, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      if (!shopId) return res.status(400).json({ message: "Select a shop first" });
      const parsed = planSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid plan", errors: parsed.error.flatten() });
      return res.status(201).json(await storage.createPlan(shopId, parsed.data));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.patch("/api/plans/:id", requireAdmin, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      const id = Number.parseInt(getRouteParam(req.params.id) ?? "", 10);
      if (!shopId || Number.isNaN(id)) return res.status(400).json({ message: "Invalid request" });
      const parsed = planSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid plan" });
      const plan = await storage.updatePlan(shopId, id, parsed.data);
      if (!plan) return res.status(404).json({ message: "Plan not found" });
      return res.json(plan);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.delete("/api/plans/:id", requireAdmin, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      const id = Number.parseInt(getRouteParam(req.params.id) ?? "", 10);
      if (!shopId || Number.isNaN(id)) return res.status(400).json({ message: "Invalid request" });
      await storage.deletePlan(shopId, id);
      return res.json({ message: "Plan deleted" });
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  });
  app2.get("/api/customer-plans", requireAuth, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      if (!shopId) return res.status(400).json({ message: "Select a shop first" });
      return res.json(await storage.listCustomerPlans(shopId));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.get("/api/customer-plans/customer/:customerId", requireAuth, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      const customerId = Number.parseInt(getRouteParam(req.params.customerId) ?? "", 10);
      if (!shopId || Number.isNaN(customerId)) return res.status(400).json({ message: "Enter a valid customer ID" });
      const customerPlan = await storage.getActiveCustomerPlan(shopId, customerId);
      if (!customerPlan) return res.status(404).json({ message: "No active plan found for this customer" });
      return res.json(customerPlan);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.post("/api/customer-plans", requireAuth, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      if (!shopId) return res.status(400).json({ message: "Select a shop first" });
      const parsed = assignmentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid plan assignment" });
      return res.status(201).json(await storage.assignPlan(shopId, parsed.data.customerId, parsed.data.planId));
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  });
  app2.post("/api/customer-plans/purchase", requireAuth, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      if (!shopId) return res.status(400).json({ message: "Select a shop first" });
      const parsed = planPurchaseSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Select a customer, plan, and payment method" });
      return res.status(201).json(await storage.assignPlanWithPayment(shopId, parsed.data.customerId, parsed.data.planId, parsed.data.paymentMethod));
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  });
  app2.post("/api/customer-plans/:id/upgrade", requireAuth, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      const customerPlanId = Number.parseInt(getRouteParam(req.params.id) ?? "", 10);
      if (!shopId || Number.isNaN(customerPlanId)) return res.status(400).json({ message: "Invalid request" });
      const parsed = upgradeSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Select a valid upgrade plan" });
      return res.json(await storage.upgradePlan(shopId, customerPlanId, parsed.data.planId));
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  });
  app2.post("/api/customer-plans/:id/usage", requireAuth, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      const customerPlanId = Number.parseInt(getRouteParam(req.params.id) ?? "", 10);
      if (!shopId || Number.isNaN(customerPlanId)) return res.status(400).json({ message: "Invalid request" });
      const parsed = consumeSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Enter a valid number of hours" });
      return res.json(await storage.consumePlanHours(shopId, customerPlanId, parsed.data.hoursUsed, parsed.data.note));
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  });
  app2.post("/api/payments", requireAuth, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      if (!shopId) return res.status(400).json({ message: "Select a shop first" });
      const parsed = paymentSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Enter valid payment details" });
      return res.status(201).json(await storage.createPayment(shopId, parsed.data));
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }
  });
  app2.get("/api/reports", requireAdmin, async (req, res) => {
    try {
      const shopId = currentShopId(req);
      if (!shopId) return res.status(400).json({ message: "Select a shop first" });
      const fromText = typeof req.query.from === "string" ? req.query.from : "";
      const toText = typeof req.query.to === "string" ? req.query.to : "";
      const from = fromText ? /* @__PURE__ */ new Date(`${fromText}T00:00:00`) : /* @__PURE__ */ new Date(0);
      const to = toText ? /* @__PURE__ */ new Date(`${toText}T23:59:59.999`) : /* @__PURE__ */ new Date();
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
        return res.status(400).json({ message: "Enter a valid date range" });
      }
      return res.json(await storage.getReports(shopId, from, to));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.post("/api/sessions", requireAuth, async (req, res) => {
    try {
      const parsed = createSessionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      await ensureInventoryAvailability(
        req.session.shopId ?? null,
        parsed.data.childSocks,
        parsed.data.parentSocks ?? null
      );
      const shopId = req.session.shopId;
      if (!shopId) return res.status(400).json({ message: "Select a shop first" });
      const { customerId, ...sessionData } = parsed.data;
      const session2 = await storage.createSessionWithCustomerPlan(sessionData, shopId, customerId);
      return res.status(201).json(session2);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.patch("/api/sessions/:id", requireAuth, async (req, res) => {
    try {
      const rawId = getRouteParam(req.params.id);
      const id = parseInt(rawId ?? "", 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid session ID" });
      const parsed = updateSessionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      const existingSession = (await storage.getAllSessions(req.session.shopId ?? null)).find((session3) => session3.id === id);
      if (!existingSession) return res.status(404).json({ message: "Session not found" });
      await ensureInventoryAvailability(
        req.session.shopId ?? null,
        parsed.data.childSocks ?? existingSession.childSocks,
        parsed.data.parentSocks === void 0 ? existingSession.parentSocks : parsed.data.parentSocks,
        id
      );
      const session2 = await storage.updateSession(id, parsed.data);
      if (!session2) return res.status(404).json({ message: "Session not found" });
      return res.json(session2);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.patch("/api/sessions/:id/end", requireAuth, async (req, res) => {
    try {
      const rawId = getRouteParam(req.params.id);
      const id = parseInt(rawId ?? "", 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid session ID" });
      const session2 = await storage.endSession(id, /* @__PURE__ */ new Date());
      if (!session2) return res.status(404).json({ message: "Session not found" });
      return res.json(session2);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.get("/api/sessions", requireAuth, async (req, res) => {
    try {
      const date = req.query.date;
      const shopId = req.session.shopId ?? null;
      const result = date ? await storage.getSessionsByDate(date, shopId) : await storage.getAllSessions(shopId);
      return res.json(result);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  app2.get("/api/sessions/export", requireAdmin, async (req, res) => {
    try {
      const date = req.query.date;
      const shopId = req.session.shopId ?? null;
      const shopName = req.session.shopName ?? "";
      const sessionList = date ? await storage.getSessionsByDate(date, shopId) : await storage.getAllSessions(shopId);
      const formatTime = (ts) => {
        if (!ts) return "";
        return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      };
      const formatDuration = (inTime, outTime) => {
        if (!outTime) return "Active";
        const ms = outTime.getTime() - inTime.getTime();
        const mins = Math.floor(ms / 6e4);
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      };
      const headers = [
        "ID",
        "Shop",
        "Kid Name",
        "Date",
        "In Time",
        "Out Time",
        "Duration",
        "Hours Booked",
        "Child Socks",
        "Parent 1 Socks",
        "Parent 2 Socks",
        "Parents Count",
        "Custom Fields"
      ];
      const rows = sessionList.map((s) => {
        const customStr = Array.isArray(s.customFields) ? s.customFields.map((cf) => `${cf.label}: ${cf.value}`).join("; ") : "";
        const socks = s.parentSocks ? s.parentSocks.split(" | ") : [];
        return [
          s.id,
          `"${shopName}"`,
          `"${s.kidName}"`,
          s.date,
          formatTime(s.inTime),
          formatTime(s.outTime),
          `"${formatDuration(s.inTime, s.outTime)}"`,
          s.hoursOfPlay,
          `"${s.childSocks}"`,
          `"${socks[0] ?? ""}"`,
          `"${socks[1] ?? ""}"`,
          s.parentsCount,
          `"${customStr}"`
        ].join(",");
      });
      const csv = [headers.join(","), ...rows].join("\n");
      const filename = date ? `sessions-${shopName}-${date}.csv` : `sessions-${shopName}-all.csv`;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(csv);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
  return httpServer2;
}

// server/app.ts
var app = express();
var httpServer = createServer(app);
var initialization;
function requireProductionConfig() {
  if (process.env.NODE_ENV !== "production") return;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required in production");
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters in production");
  }
}
async function configureApp() {
  requireProductionConfig();
  const isProduction = process.env.NODE_ENV === "production";
  const PgStore = connectPgSimple(session);
  if (isProduction) app.set("trust proxy", 1);
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(session({
    name: "playtracker.sid",
    secret: process.env.SESSION_SECRET || "local-development-only-secret-change-me",
    resave: false,
    saveUninitialized: false,
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      tableName: "user_sessions",
      createTableIfMissing: true
    }),
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1e3
    }
  }));
  app.use("/api/auth", rateLimit({
    windowMs: 15 * 60 * 1e3,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many login attempts. Please try again later." }
  }));
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) {
        console.log(`[api] ${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`);
      }
    });
    next();
  });
  if (process.env.SEED_DEFAULT_DATA === "true") {
    if (!process.env.DEFAULT_ADMIN_PASSWORD) {
      throw new Error("DEFAULT_ADMIN_PASSWORD is required when SEED_DEFAULT_DATA=true");
    }
    await seedDefaultAdmin(process.env.DEFAULT_ADMIN_PASSWORD, process.env.DEFAULT_ADMIN_USERNAME || "admin");
    await seedDefaultShop();
  }
  await registerRoutes(httpServer, app);
  app.use((err, _req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (res.headersSent) return next(err);
    console.error("[server]", err);
    return res.status(status).json({ message: status >= 500 ? "Internal Server Error" : err.message });
  });
}
function initializeApp() {
  initialization ??= configureApp();
  return initialization;
}

// api/_handler.ts
var initialized = initializeApp();
async function handler(req, res) {
  await initialized;
  return app(req, res);
}
export {
  handler as default
};
