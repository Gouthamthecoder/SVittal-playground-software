import { app, initializeApp } from "../server/app";

const initialized = initializeApp();

export default async function handler(req: any, res: any) {
  await initialized;
  return app(req, res);
}
