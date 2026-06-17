import "../sentry.server.config";
import express from "express";
import next from "next";
import { clerkMiddleware } from "@clerk/express";
import { captureException } from "@sentry/node";

import adminRoutes from "./routes/admin";
import authRoutes from "./routes/auth";
import { env } from "./lib/env";
import movieRoutes from "./routes/movies";
import settingsRoutes from "./routes/settings";
import tmdbRoutes from "./routes/tmdb";
import scrapeRoutes from "./routes/scrape";
import { isServerClerkConfigured } from "./lib/auth";
import { AppError } from "./lib/errors";
import { ensureUploadsDir, isUsingDefaultPublicUploadsDir, uploadsDir, uploadsPublicUrl } from "./lib/uploads";

const dev = process.env.NODE_ENV !== "production";
const port = Number.parseInt(env.PORT, 10);

const app = next({ dev });
const handle = app.getRequestHandler();

async function bootstrap() {
  await app.prepare();

  const server = express();
  ensureUploadsDir();

  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));
  server.use(isServerClerkConfigured() ? clerkMiddleware() : (_request, _response, nextHandler) => nextHandler());

  if (!isUsingDefaultPublicUploadsDir()) {
    server.use(uploadsPublicUrl, express.static(uploadsDir, {
      fallthrough: false,
      immutable: true,
      maxAge: "7d",
    }));
  }

  server.get("/api/health", (_request, response) => {
    response.json({ ok: true });
  });

  server.use("/api/auth", authRoutes);
  server.use("/api/admin", adminRoutes);
  server.use("/api/movies", movieRoutes);
  server.use("/api/settings", settingsRoutes);
  server.use("/api/tmdb", tmdbRoutes);
  server.use("/api/scrape", scrapeRoutes);

  server.all("*", async (request, response, nextHandler) => {
    try {
      await handle(request, response);
    } catch (error) {
      nextHandler(error);
    }
  });

  server.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof AppError) {
      captureException(error);
      response.status(error.statusCode).json({ error: error.message });
      return;
    }

    if (error && typeof error === "object" && "issues" in error) {
      captureException(new Error("Invalid request payload."));
      response.status(400).json({ error: "Invalid request payload.", details: error });
      return;
    }

    captureException(error instanceof Error ? error : new Error("Unknown server error"));
    console.error(error);
    response.status(500).json({ error: "Internal server error." });
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`Movies I Loved listening on http://0.0.0.0:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
