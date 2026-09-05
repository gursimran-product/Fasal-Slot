import "dotenv/config";
import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./logger";
import { pool } from "./db/pool";
import { redis } from "./redis";

const app = express();

app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    await redis.ping();
    res.status(200).json({ status: "ok" });
  } catch (err) {
    logger.error(err, "health check failed");
    res.status(503).json({ status: "unavailable" });
  }
});

const port = Number(process.env.PORT ?? 4000);

async function start() {
  await redis.connect();
  app.listen(port, () => {
    logger.info(`api listening on port ${port}`);
  });
}

start().catch((err) => {
  logger.error(err, "failed to start server");
  process.exit(1);
});
