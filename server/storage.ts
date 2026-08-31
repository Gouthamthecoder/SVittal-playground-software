import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, asc, desc, ilike, gte, lte } from "drizzle-orm";
import pg from "pg";
import crypto from "crypto";
import {
  type User, type InsertUser,
  type Session, type InsertSession,
  type Shop, type InsertShop,
  type UserShop,
  type SocksInventoryItem,
  type BillingField, type Customer, type Plan, type CustomerPlan, type CustomerPlanUsage, type Payment,
  users, sessions, shops, userShops, socksInventoryItems,
  billingFields, customers, plans, customerPlans, customerPlanUsage, payments,
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

export interface CustomerPlanSummary extends CustomerPlan {
  customer: Customer;
  plan: Plan;
}

export interface BillingFieldInput {
  label: string;
  fieldType: string;
  required?: boolean;
  options?: string[];
  sortOrder?: number;
  active?: boolean;
}

export interface CustomerInput {
  name: string;
  phone: string;
  dateOfBirth?: string | null;
  customFields?: Array<{ id: string; label: string; value: string }>;
}

export interface PlanInput {
  name: string;
  description?: string | null;
  totalHours: number;
  price?: number | null;
  durationDays?: number | null;
  active?: boolean;
}

export interface PaymentInput {
  customerPlanId: number;
  amount: number;
  paymentMethod: "cash" | "card" | "upi";
}

export interface PaymentSummary extends Payment {
  customer: Customer;
  plan: Plan;
}

export interface ReportsSummary {
  customers: Customer[];
  customerPlans: CustomerPlanSummary[];
  payments: PaymentSummary[];
}

export interface PlanPurchaseResult {
  customerPlan: CustomerPlan;
  payment: PaymentSummary;
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

  // Socks inventory
  listSocksInventory(shopId: number): Promise<SocksInventoryItem[]>;
  replaceSocksInventory(
    shopId: number,
    items: Array<{ category: string; size: string; quantity: number }>
  ): Promise<SocksInventoryItem[]>;

  // Customer billing
  listBillingFields(shopId: number): Promise<BillingField[]>;
  createBillingField(shopId: number, input: BillingFieldInput): Promise<BillingField>;
  updateBillingField(shopId: number, id: number, input: Partial<BillingFieldInput>): Promise<BillingField | undefined>;
  deleteBillingField(shopId: number, id: number): Promise<void>;
  listCustomers(shopId: number, phoneSearch?: string): Promise<Customer[]>;
  getCustomer(shopId: number, id: number): Promise<Customer | undefined>;
  createCustomer(shopId: number, input: CustomerInput): Promise<Customer>;
  updateCustomer(shopId: number, id: number, input: Partial<CustomerInput>): Promise<Customer | undefined>;

  // Plans and balances
  listPlans(shopId: number): Promise<Plan[]>;
  createPlan(shopId: number, input: PlanInput): Promise<Plan>;
  updatePlan(shopId: number, id: number, input: Partial<PlanInput>): Promise<Plan | undefined>;
  deletePlan(shopId: number, id: number): Promise<void>;
  listCustomerPlans(shopId: number): Promise<CustomerPlanSummary[]>;
  getActiveCustomerPlan(shopId: number, customerId: number): Promise<CustomerPlanSummary | undefined>;
  assignPlan(shopId: number, customerId: number, planId: number): Promise<CustomerPlan>;
  assignPlanWithPayment(shopId: number, customerId: number, planId: number, paymentMethod: "cash" | "card" | "upi"): Promise<PlanPurchaseResult>;
  upgradePlan(shopId: number, customerPlanId: number, planId: number): Promise<CustomerPlan>;
  consumePlanHours(shopId: number, customerPlanId: number, hoursUsed: number, note?: string | null): Promise<CustomerPlan>;
  createSessionWithCustomerPlan(data: InsertSession, shopId: number, customerId: number): Promise<Session>;
  createPayment(shopId: number, input: PaymentInput): Promise<PaymentSummary>;
  getReports(shopId: number, from: Date, to: Date): Promise<ReportsSummary>;

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

  // ── Socks inventory ───────────────────────────────────────────────────────
  async listSocksInventory(shopId: number): Promise<SocksInventoryItem[]> {
    return await db
      .select()
      .from(socksInventoryItems)
      .where(eq(socksInventoryItems.shopId, shopId));
  }

  async replaceSocksInventory(
    shopId: number,
    items: Array<{ category: string; size: string; quantity: number }>
  ): Promise<SocksInventoryItem[]> {
    await db.delete(socksInventoryItems).where(eq(socksInventoryItems.shopId, shopId));

    if (items.length === 0) {
      return [];
    }

    return await db
      .insert(socksInventoryItems)
      .values(items.map((item) => ({ ...item, shopId })))
      .returning();
  }

  // ── Customer billing ─────────────────────────────────────────────────────
  async listBillingFields(shopId: number): Promise<BillingField[]> {
    return db.select().from(billingFields)
      .where(eq(billingFields.shopId, shopId))
      .orderBy(asc(billingFields.sortOrder), asc(billingFields.id));
  }

  async createBillingField(shopId: number, input: BillingFieldInput): Promise<BillingField> {
    const result = await db.insert(billingFields).values({
      shopId,
      label: input.label,
      fieldType: input.fieldType,
      required: input.required ?? false,
      options: input.options ?? [],
      sortOrder: input.sortOrder ?? 0,
      active: input.active ?? true,
    }).returning();
    return result[0];
  }

  async updateBillingField(shopId: number, id: number, input: Partial<BillingFieldInput>): Promise<BillingField | undefined> {
    const result = await db.update(billingFields).set(input)
      .where(and(eq(billingFields.shopId, shopId), eq(billingFields.id, id))).returning();
    return result[0];
  }

  async deleteBillingField(shopId: number, id: number): Promise<void> {
    await db.delete(billingFields).where(and(eq(billingFields.shopId, shopId), eq(billingFields.id, id)));
  }

  async listCustomers(shopId: number, phoneSearch?: string): Promise<Customer[]> {
    const where = phoneSearch
      ? and(eq(customers.shopId, shopId), ilike(customers.phone, `%${phoneSearch}%`))
      : eq(customers.shopId, shopId);
    return db.select().from(customers).where(where).orderBy(desc(customers.createdAt)).limit(phoneSearch ? 25 : 100);
  }

  async getCustomer(shopId: number, id: number): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(and(eq(customers.shopId, shopId), eq(customers.id, id))).limit(1);
    return result[0];
  }

  async createCustomer(shopId: number, input: CustomerInput): Promise<Customer> {
    const result = await db.insert(customers).values({
      shopId,
      name: input.name,
      phone: input.phone,
      dateOfBirth: input.dateOfBirth ?? null,
      customFields: input.customFields ?? [],
    }).returning();
    return result[0];
  }

  async updateCustomer(shopId: number, id: number, input: Partial<CustomerInput>): Promise<Customer | undefined> {
    const result = await db.update(customers).set(input)
      .where(and(eq(customers.shopId, shopId), eq(customers.id, id))).returning();
    return result[0];
  }

  // ── Plans and balances ───────────────────────────────────────────────────
  async listPlans(shopId: number): Promise<Plan[]> {
    return db.select().from(plans).where(eq(plans.shopId, shopId)).orderBy(desc(plans.createdAt));
  }

  async createPlan(shopId: number, input: PlanInput): Promise<Plan> {
    const result = await db.insert(plans).values({ shopId, ...input }).returning();
    return result[0];
  }

  async updatePlan(shopId: number, id: number, input: Partial<PlanInput>): Promise<Plan | undefined> {
    const result = await db.update(plans).set(input)
      .where(and(eq(plans.shopId, shopId), eq(plans.id, id))).returning();
    return result[0];
  }

  async deletePlan(shopId: number, id: number): Promise<void> {
    await db.delete(plans).where(and(eq(plans.shopId, shopId), eq(plans.id, id)));
  }

  async listCustomerPlans(shopId: number): Promise<CustomerPlanSummary[]> {
    const rows = await db.select({ customerPlan: customerPlans, customer: customers, plan: plans })
      .from(customerPlans)
      .innerJoin(customers, eq(customerPlans.customerId, customers.id))
      .innerJoin(plans, eq(customerPlans.planId, plans.id))
      .where(eq(customerPlans.shopId, shopId))
      .orderBy(desc(customerPlans.startDate));
    return rows.map((row) => ({ ...row.customerPlan, customer: row.customer, plan: row.plan }));
  }

  async getActiveCustomerPlan(shopId: number, customerId: number): Promise<CustomerPlanSummary | undefined> {
    const rows = await db.select({ customerPlan: customerPlans, customer: customers, plan: plans })
      .from(customerPlans)
      .innerJoin(customers, eq(customerPlans.customerId, customers.id))
      .innerJoin(plans, eq(customerPlans.planId, plans.id))
      .where(and(
        eq(customerPlans.shopId, shopId),
        eq(customerPlans.customerId, customerId),
        eq(customerPlans.status, "active"),
      ))
      .orderBy(desc(customerPlans.startDate))
      .limit(1);
    return rows[0] ? { ...rows[0].customerPlan, customer: rows[0].customer, plan: rows[0].plan } : undefined;
  }

  async assignPlan(shopId: number, customerId: number, planId: number): Promise<CustomerPlan> {
    const [customer, plan] = await Promise.all([
      db.select().from(customers).where(and(eq(customers.id, customerId), eq(customers.shopId, shopId))),
      db.select().from(plans).where(and(eq(plans.id, planId), eq(plans.shopId, shopId), eq(plans.active, true))),
    ]);
    if (!customer[0]) throw new Error("Customer not found");
    if (!plan[0]) throw new Error("Plan not found or inactive");
    const endDate = plan[0].durationDays ? new Date(Date.now() + plan[0].durationDays * 86400000) : null;
    const result = await db.insert(customerPlans).values({
      shopId, customerId, planId, purchasedHours: plan[0].totalHours, remainingHours: plan[0].totalHours, endDate,
    }).returning();
    return result[0];
  }

  async assignPlanWithPayment(shopId: number, customerId: number, planId: number, paymentMethod: "cash" | "card" | "upi"): Promise<PlanPurchaseResult> {
    return db.transaction(async (tx) => {
      const rows = await tx.select({ customer: customers, plan: plans })
        .from(customers)
        .innerJoin(plans, and(eq(plans.shopId, customers.shopId), eq(plans.id, planId)))
        .where(and(eq(customers.id, customerId), eq(customers.shopId, shopId), eq(plans.active, true)))
        .limit(1);
      if (!rows[0]) throw new Error("Customer or active plan not found");
      if (rows[0].plan.price === null || rows[0].plan.price <= 0) throw new Error("This plan needs a payment amount before it can be assigned");

      const activePlans = await tx.select().from(customerPlans).where(and(
        eq(customerPlans.shopId, shopId), eq(customerPlans.customerId, customerId), eq(customerPlans.status, "active"),
      ));
      const carriedHours = activePlans.reduce((total, existingPlan) => total + existingPlan.remainingHours, 0);
      for (const existingPlan of activePlans) {
        await tx.update(customerPlans).set({ status: "upgraded" }).where(eq(customerPlans.id, existingPlan.id));
      }

      const endDate = rows[0].plan.durationDays ? new Date(Date.now() + rows[0].plan.durationDays * 86400000) : null;
      const combinedHours = carriedHours + rows[0].plan.totalHours;
      const createdPlan = await tx.insert(customerPlans).values({
        shopId, customerId, planId, purchasedHours: combinedHours, remainingHours: combinedHours, endDate,
      }).returning();
      const createdPayment = await tx.insert(payments).values({
        shopId, customerId, customerPlanId: createdPlan[0].id, amount: rows[0].plan.price, paymentMethod,
      }).returning();
      return {
        customerPlan: createdPlan[0],
        payment: { ...createdPayment[0], customer: rows[0].customer, plan: rows[0].plan },
      };
    });
  }

  async upgradePlan(shopId: number, customerPlanId: number, planId: number): Promise<CustomerPlan> {
    const current = await db.select().from(customerPlans).where(and(
      eq(customerPlans.id, customerPlanId), eq(customerPlans.shopId, shopId), eq(customerPlans.status, "active"),
    ));
    if (!current[0]) throw new Error("Active customer plan not found");
    const nextPlan = await db.select().from(plans).where(and(eq(plans.id, planId), eq(plans.shopId, shopId), eq(plans.active, true)));
    if (!nextPlan[0]) throw new Error("Plan not found or inactive");

    const endDate = nextPlan[0].durationDays ? new Date(Date.now() + nextPlan[0].durationDays * 86400000) : null;
    const result = await db.transaction(async (tx) => {
      await tx.update(customerPlans).set({ status: "upgraded" }).where(eq(customerPlans.id, customerPlanId));
      return tx.insert(customerPlans).values({
        shopId,
        customerId: current[0].customerId,
        planId,
        purchasedHours: current[0].remainingHours + nextPlan[0].totalHours,
        remainingHours: current[0].remainingHours + nextPlan[0].totalHours,
        endDate,
      }).returning();
    });
    return result[0];
  }

  async consumePlanHours(shopId: number, customerPlanId: number, hoursUsed: number, note?: string | null): Promise<CustomerPlan> {
    const current = await db.select().from(customerPlans).where(and(
      eq(customerPlans.id, customerPlanId), eq(customerPlans.shopId, shopId), eq(customerPlans.status, "active"),
    ));
    if (!current[0]) throw new Error("Active customer plan not found");
    if (hoursUsed > current[0].remainingHours) throw new Error("Usage cannot be greater than the available balance");
    const result = await db.transaction(async (tx) => {
      await tx.insert(customerPlanUsage).values({ shopId, customerPlanId, hoursUsed, note: note ?? null });
      return tx.update(customerPlans).set({ remainingHours: current[0].remainingHours - hoursUsed })
        .where(eq(customerPlans.id, customerPlanId)).returning();
    });
    return result[0];
  }

  async createSessionWithCustomerPlan(data: InsertSession, shopId: number, customerId: number): Promise<Session> {
    return db.transaction(async (tx) => {
      const customer = await tx.select().from(customers).where(and(
        eq(customers.id, customerId), eq(customers.shopId, shopId),
      ));
      if (!customer[0]) throw new Error("Customer not found for this shop");

      const activePlans = await tx.select().from(customerPlans).where(and(
        eq(customerPlans.customerId, customerId), eq(customerPlans.shopId, shopId), eq(customerPlans.status, "active"),
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
        inTime: new Date(),
      }).returning();
      await tx.insert(customerPlanUsage).values({
        shopId,
        customerPlanId: activePlan.id,
        hoursUsed: data.hoursOfPlay,
        note: `Dashboard play session #${created[0].id}`,
      });
      await tx.update(customerPlans).set({
        remainingHours: activePlan.remainingHours - data.hoursOfPlay,
      }).where(eq(customerPlans.id, activePlan.id));
      return created[0];
    });
  }

  async createPayment(shopId: number, input: PaymentInput): Promise<PaymentSummary> {
    const planRows = await db.select({ customerPlan: customerPlans, customer: customers, plan: plans })
      .from(customerPlans)
      .innerJoin(customers, eq(customerPlans.customerId, customers.id))
      .innerJoin(plans, eq(customerPlans.planId, plans.id))
      .where(and(eq(customerPlans.id, input.customerPlanId), eq(customerPlans.shopId, shopId)))
      .limit(1);
    if (!planRows[0]) throw new Error("Customer plan not found");
    const created = await db.insert(payments).values({
      shopId,
      customerId: planRows[0].customer.id,
      customerPlanId: input.customerPlanId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
    }).returning();
    return { ...created[0], customer: planRows[0].customer, plan: planRows[0].plan };
  }

  async getReports(shopId: number, from: Date, to: Date): Promise<ReportsSummary> {
    const [customerRows, planRows, paymentRows] = await Promise.all([
      db.select().from(customers).where(and(eq(customers.shopId, shopId), gte(customers.createdAt, from), lte(customers.createdAt, to))).orderBy(desc(customers.createdAt)),
      db.select({ customerPlan: customerPlans, customer: customers, plan: plans })
        .from(customerPlans).innerJoin(customers, eq(customerPlans.customerId, customers.id)).innerJoin(plans, eq(customerPlans.planId, plans.id))
        .where(and(eq(customerPlans.shopId, shopId), gte(customerPlans.startDate, from), lte(customerPlans.startDate, to))).orderBy(desc(customerPlans.startDate)),
      db.select({ payment: payments, customer: customers, plan: plans })
        .from(payments).innerJoin(customers, eq(payments.customerId, customers.id)).innerJoin(customerPlans, eq(payments.customerPlanId, customerPlans.id)).innerJoin(plans, eq(customerPlans.planId, plans.id))
        .where(and(eq(payments.shopId, shopId), gte(payments.paidAt, from), lte(payments.paidAt, to))).orderBy(desc(payments.paidAt)),
    ]);
    return {
      customers: customerRows,
      customerPlans: planRows.map((row) => ({ ...row.customerPlan, customer: row.customer, plan: row.plan })),
      payments: paymentRows.map((row) => ({ ...row.payment, customer: row.customer, plan: row.plan })),
    };
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
export async function seedDefaultAdmin(password: string, username = "admin") {
  const existing = await storage.getUserByUsername(username);
  if (!existing) {
    await storage.createUser({
      username,
      password: hashPassword(password),
      role: "admin",
    });
    console.log(`[auth] Default admin created for ${username}`);
  }
}

export async function seedDefaultShop() {
  const existing = await storage.listShops();
  if (existing.length === 0) {
    await storage.createShop({ name: "Main Shop", code: "MAIN" });
    console.log("[shops] Default shop created — Main Shop");
  }
}
