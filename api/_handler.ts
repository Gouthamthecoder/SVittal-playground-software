import { app, initializeApp } from "../server/app";

const initialized = initializeApp().catch((error) => {
  console.error("[startup] Application initialization failed", error);
  throw error;
});

async function handler(req: any, res: any) {
  await initialized;
  return app(req, res);
}

// Vercel's Node runtime loads this generated API bundle as CommonJS.
module.exports = handler;
