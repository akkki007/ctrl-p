import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { toNodeHandler } from "better-auth/node";
import express from "express";
import { AppModule } from "./app.module.js";
import { auth } from "./auth/auth.js";

async function bootstrap() {
  // better-auth needs the raw request body, so Nest's global body parser is
  // disabled and JSON parsing is re-attached *after* the auth handler.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.enableCors({
    origin: process.env.WEB_URL ?? "http://localhost:3000",
    credentials: true,
  });

  app.use("/api/auth", toNodeHandler(auth));
  app.use(express.json({ limit: "5mb" }));

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}

void bootstrap();
