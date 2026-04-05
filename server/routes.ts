import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, hashPassword, verifyPassword } from "./storage";
import { insertSessionSchema } from "@shared/schema";
import { z } from "zod";

// ── Auth middleware ──────────────────────────────────────────────────────────
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (req.session.userRole !== "admin") {
    return res.status(403).json({ message: "Forbidden — admin access required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Auth routes ──────────────────────────────────────────────────────────

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      const user = await storage.getUserByUsername(username.trim().toLowerCase());
      if (!user || !verifyPassword(password, user.password)) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.session.userId = user.id;
      req.session.userRole = user.role;
      req.session.username = user.username;
      return res.json({ id: user.id, username: user.username, role: user.role });
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

  // Get current user
  app.get("/api/auth/me", (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not logged in" });
    }
    return res.json({
      id: req.session.userId,
      username: req.session.username,
      role: req.session.userRole,
    });
  });

  // ── User management (admin only) ─────────────────────────────────────────

  const createUserSchema = z.object({
    username: z.string().min(2).max(50),
    password: z.string().min(4),
    role: z.enum(["admin", "staff"]).default("staff"),
  });

  // List all users
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const allUsers = await storage.listUsers();
      return res.json(allUsers.map(u => ({ id: u.id, username: u.username, role: u.role })));
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Create a new user
  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }
      const existing = await storage.getUserByUsername(parsed.data.username.toLowerCase());
      if (existing) {
        return res.status(409).json({ message: "Username already taken" });
      }
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

  // Delete a user
  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      if (id === req.session.userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      await storage.deleteUser(id);
      return res.json({ message: "User deleted" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // ── Session (play) routes ─────────────────────────────────────────────────

  // Create a new session (kid checks in) — any authenticated user
  app.post("/api/sessions", requireAuth, async (req, res) => {
    try {
      const parsed = insertSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }
      const session = await storage.createSession(parsed.data);
      return res.status(201).json(session);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // End a session (kid checks out) — any authenticated user
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

  // Get sessions — any authenticated user (needed to load active floor)
  app.get("/api/sessions", requireAuth, async (req, res) => {
    try {
      const date = req.query.date as string | undefined;
      const sessions = date
        ? await storage.getSessionsByDate(date)
        : await storage.getAllSessions();
      return res.json(sessions);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // Export sessions as CSV — admin only
  app.get("/api/sessions/export", requireAdmin, async (req, res) => {
    try {
      const date = req.query.date as string | undefined;
      const sessions = date
        ? await storage.getSessionsByDate(date)
        : await storage.getAllSessions();

      const formatTime = (ts: Date | null) => {
        if (!ts) return "";
        return new Date(ts).toLocaleTimeString("en-US", {
          hour: "2-digit", minute: "2-digit", hour12: true
        });
      };

      const formatDuration = (inTime: Date, outTime: Date | null) => {
        if (!outTime) return "Active";
        const ms = outTime.getTime() - inTime.getTime();
        const mins = Math.floor(ms / 60000);
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      };

      const parentSocksColumns = (s: typeof sessions[0]) => {
        const socks = s.parentSocks ? s.parentSocks.split(" | ") : [];
        return { p1: socks[0] ?? "", p2: socks[1] ?? "" };
      };

      const headers = [
        "ID", "Kid Name", "Date", "In Time", "Out Time", "Duration",
        "Hours Booked", "Child Socks", "Parent 1 Socks", "Parent 2 Socks",
        "Parents Count", "Custom Fields"
      ];

      const rows = sessions.map(s => {
        const customStr = Array.isArray(s.customFields)
          ? (s.customFields as any[]).map((cf: any) => `${cf.label}: ${cf.value}`).join("; ")
          : "";
        const { p1, p2 } = parentSocksColumns(s);
        return [
          s.id,
          `"${s.kidName}"`,
          s.date,
          formatTime(s.inTime),
          formatTime(s.outTime),
          `"${formatDuration(s.inTime, s.outTime)}"`,
          s.hoursOfPlay,
          `"${s.childSocks}"`,
          `"${p1}"`,
          `"${p2}"`,
          s.parentsCount,
          `"${customStr}"`
        ].join(",");
      });

      const csv = [headers.join(","), ...rows].join("\n");
      const filename = date ? `sessions-${date}.csv` : `sessions-all.csv`;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.send(csv);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
