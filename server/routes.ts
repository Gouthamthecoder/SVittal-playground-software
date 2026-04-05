import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSessionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Create a new session (kid checks in)
  app.post("/api/sessions", async (req, res) => {
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

  // End a session (kid checks out)
  app.patch("/api/sessions/:id/end", async (req, res) => {
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

  // Get sessions for a specific date
  app.get("/api/sessions", async (req, res) => {
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

  // Export sessions as CSV for a given date
  app.get("/api/sessions/export", async (req, res) => {
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
        const p1 = socks[0] ?? "";
        const p2 = socks[1] ?? "";
        return { p1, p2 };
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
