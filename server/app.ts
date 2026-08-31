import "../load-env";
import express, { type Request, type Response, type NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { seedDefaultAdmin, seedDefaultShop } from "./storage";

export const app = express();
export const httpServer = createServer(app);

declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole: string;
    username: string;
    shopId: number;
    shopName: string;
  }
}

let initialization: Promise<void> | undefined;

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
      createTableIfMissing: true,
    }),
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }));

  app.use("/api/auth", rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Too many login attempts. Please try again later." },
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

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    if (res.headersSent) return next(err);
    console.error("[server]", err);
    return res.status(status).json({ message: status >= 500 ? "Internal Server Error" : err.message });
  });
}

export function initializeApp(): Promise<void> {
  initialization ??= configureApp();
  return initialization;
}
