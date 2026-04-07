import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, hashPassword, verifyPassword } from "./storage";
import { insertSessionSchema } from "@shared/schema";
import { z } from "zod";

const updateSessionSchema = z.object({
  kidName: z.string().min(1).optional(),
  hoursOfPlay: z.number().positive().optional(),
  parentsCount: z.number().min(0).optional(),
  childSocks: z.string().min(1).optional(),
  parentSocks: z.string().nullable().optional(),
  customFields: z.array(z.object({ id: z.string(), label: z.string(), value: z.string() })).optional(),
});

// ── Auth middleware ──────────────────────────────────────────────────────────
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
  if (req.session.userRole !== "admin") return res.status(403).json({ message: "Forbidden — admin access required" });
  next();
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ── Auth ──────────────────────────────────────────────────────────────────

  // Step 1: validate credentials and return the user's available shops
  app.post("/api/auth/prelogin", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ message: "Username and password required" });
      const user = await storage.getUserByUsername(username.trim().toLowerCase());
      if (!user || !verifyPassword(password, user.password)) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      let shopList: { id: number; name: string; code: string | null; role?: string }[];
      if (user.role === "admin") {
        // Admin can access all shops
        shopList = (await storage.listShops()).map(s => ({ ...s, role: "admin" }));
      } else {
        shopList = await storage.getShopsByUser(user.id);
      }
      return res.json({ role: user.role, shops: shopList });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Step 2: full login — creates session with shopId
  app.post("/api/auth/login", async (req, res) => {
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
      // Check shop access for non-admin
      if (user.role !== "admin") {
        const userShops = await storage.getShopsByUser(user.id);
        const hasAccess = userShops.some(s => s.id === shop.id);
        if (!hasAccess) return res.status(403).json({ message: "You don't have access to this shop" });
      }
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.username = user.username;
      req.session.shopId = shop.id;
      req.session.shopName = shop.name;
      return res.json({ id: user.id, username: user.username, role: user.role, shopId: shop.id, shopName: shop.name });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Switch active shop (admin or staff with access to multiple shops)
  app.patch("/api/auth/shop", requireAuth, async (req, res) => {
    try {
      const { shopId } = req.body;
      if (!shopId) return res.status(400).json({ message: "shopId required" });
      const shop = await storage.getShop(Number(shopId));
      if (!shop) return res.status(400).json({ message: "Invalid shop" });
      if (req.session.userRole !== "admin") {
        const userShops = await storage.getShopsByUser(req.session.userId!);
        if (!userShops.some(s => s.id === shop.id)) {
          return res.status(403).json({ message: "You don't have access to this shop" });
        }
      }
      req.session.shopId = shop.id;
      req.session.shopName = shop.name;
      return res.json({ shopId: shop.id, shopName: shop.name });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out" });
    });
  });

  // Get current user + active shop
  app.get("/api/auth/me", (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
    return res.json({
      id: req.session.userId,
      username: req.session.username,
      role: req.session.userRole,
      shopId: req.session.shopId ?? null,
      shopName: req.session.shopName ?? null,
    });
  });

  // ── Shops (public list for login page) ───────────────────────────────────
  app.get("/api/shops", async (_req, res) => {
    try {
      return res.json(await storage.listShops());
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Create shop (admin)
  const createShopSchema = z.object({
    name: z.string().min(1).max(100),
    code: z.string().max(20).optional(),
  });

  app.post("/api/shops", requireAdmin, async (req, res) => {
    try {
      const parsed = createShopSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      const shop = await storage.createShop({ name: parsed.data.name, code: parsed.data.code ?? null });
      return res.status(201).json(shop);
    } catch (err: any) {
      if (err.message?.includes("unique")) return res.status(409).json({ message: "Shop name already exists" });
      return res.status(500).json({ message: err.message });
    }
  });

  // Delete shop (admin)
  app.delete("/api/shops/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid shop ID" });
      await storage.deleteShop(id);
      return res.json({ message: "Shop deleted" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Get users assigned to a shop (admin)
  app.get("/api/shops/:id/users", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid shop ID" });
      const result = await storage.getUsersByShop(id);
      return res.json(result.map(u => ({ id: u.id, username: u.username, role: u.role, shopRole: u.shopRole })));
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Assign user to shop (admin)
  const assignUserSchema = z.object({
    userId: z.string(),
    role: z.enum(["admin", "staff"]).default("staff"),
  });

  app.post("/api/shops/:id/users", requireAdmin, async (req, res) => {
    try {
      const shopId = parseInt(req.params.id, 10);
      if (isNaN(shopId)) return res.status(400).json({ message: "Invalid shop ID" });
      const parsed = assignUserSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data" });
      const shop = await storage.getShop(shopId);
      if (!shop) return res.status(404).json({ message: "Shop not found" });
      const user = await storage.getUser(parsed.data.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      await storage.assignUserToShop(parsed.data.userId, shopId, parsed.data.role);
      return res.json({ message: "User assigned to shop" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Remove user from shop (admin)
  app.delete("/api/shops/:id/users/:userId", requireAdmin, async (req, res) => {
    try {
      const shopId = parseInt(req.params.id, 10);
      const { userId } = req.params;
      if (isNaN(shopId)) return res.status(400).json({ message: "Invalid shop ID" });
      await storage.removeUserFromShop(userId, shopId);
      return res.json({ message: "User removed from shop" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Get shops for a specific user (admin)
  app.get("/api/users/:id/shops", requireAdmin, async (req, res) => {
    try {
      const shops = await storage.getShopsByUser(req.params.id);
      return res.json(shops);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── User management (admin only) ─────────────────────────────────────────
  const createUserSchema = z.object({
    username: z.string().min(2).max(50),
    password: z.string().min(4),
    role: z.enum(["admin", "staff"]).default("staff"),
  });

  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.listUsers();
      return res.json(allUsers.map(u => ({ id: u.id, username: u.username, role: u.role })));
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      const existing = await storage.getUserByUsername(parsed.data.username.toLowerCase());
      if (existing) return res.status(409).json({ message: "Username already taken" });
      const user = await storage.createUser({
        username: parsed.data.username.trim().toLowerCase(),
        password: hashPassword(parsed.data.password),
        role: parsed.data.role,
      });
      return res.status(201).json({ id: user.id, username: user.username, role: user.role });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      if (id === req.session.userId) return res.status(400).json({ message: "Cannot delete your own account" });
      await storage.deleteUser(id);
      return res.json({ message: "User deleted" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Session (play) routes ─────────────────────────────────────────────────

  app.post("/api/sessions", requireAuth, async (req, res) => {
    try {
      const parsed = insertSessionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      const session = await storage.createSession({
        ...parsed.data,
        shopId: req.session.shopId ?? null,
      });
      return res.status(201).json(session);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/sessions/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid session ID" });
      const parsed = updateSessionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      const session = await storage.updateSession(id, parsed.data);
      if (!session) return res.status(404).json({ message: "Session not found" });
      return res.json(session);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/sessions/:id/end", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid session ID" });
      const session = await storage.endSession(id, new Date());
      if (!session) return res.status(404).json({ message: "Session not found" });
      return res.json(session);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/sessions", requireAuth, async (req, res) => {
    try {
      const date = req.query.date as string | undefined;
      const shopId = req.session.shopId ?? null;
      const result = date
        ? await storage.getSessionsByDate(date, shopId)
        : await storage.getAllSessions(shopId);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/sessions/export", requireAdmin, async (req, res) => {
    try {
      const date = req.query.date as string | undefined;
      const shopId = req.session.shopId ?? null;
      const shopName = req.session.shopName ?? "";
      const sessionList = date
        ? await storage.getSessionsByDate(date, shopId)
        : await storage.getAllSessions(shopId);

      const formatTime = (ts: Date | null) => {
        if (!ts) return "";
        return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      };

      const formatDuration = (inTime: Date, outTime: Date | null) => {
        if (!outTime) return "Active";
        const ms = outTime.getTime() - inTime.getTime();
        const mins = Math.floor(ms / 60000);
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      };

      const headers = [
        "ID", "Shop", "Kid Name", "Date", "In Time", "Out Time", "Duration",
        "Hours Booked", "Child Socks", "Parent 1 Socks", "Parent 2 Socks",
        "Parents Count", "Custom Fields"
      ];

      const rows = sessionList.map(s => {
        const customStr = Array.isArray(s.customFields)
          ? (s.customFields as any[]).map((cf: any) => `${cf.label}: ${cf.value}`).join("; ")
          : "";
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
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
