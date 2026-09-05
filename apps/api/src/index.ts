import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { logger } from "./logger";
import { pool } from "./db/pool";
import { redis } from "./redis";
import authRouter from "./routes/auth";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(pinoHttp({ logger }));

app.use("/api/v1/auth", authRouter);

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
