import { goalsRouter } from "./routes/goals.routes.js";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { allowedOrigins, originGuard, authenticationLimiters, securityEvents } from "./middleware/security.js";
import { getJwtSecret } from "./config/environment.js";
import { getSessionSeconds } from "./auth/sessions.js";
import { sendError } from "./lib/validation.js";
import { authRouter } from "./routes/auth.routes.js";
import { teamsRouter } from "./routes/teams.routes.js";
import { trainingsRouter } from "./routes/trainings.routes.js";
import { legalRouter } from "./routes/legal.routes.js";

export function createApp() {
  getJwtSecret();
  getSessionSeconds();
  const app = express();
  app.disable("x-powered-by");
  app.use(securityEvents);
  // Confie somente no proxy explicitamente configurado; nunca em qualquer hop.
  if (process.env.TRUST_PROXY) {
    const proxies = process.env.TRUST_PROXY.split(",").map((value) => value.trim());
    if (proxies.some((value) => ["true", "false", "0.0.0.0/0", "::/0", "0", "1"].includes(value))) throw new Error("TRUST_PROXY deve identificar somente proxies confiáveis por IP, subnet ou loopback.");
    app.set("trust proxy", proxies);
  }
  const origins = allowedOrigins();
  const limits = authenticationLimiters();
  app.use(helmet({ strictTransportSecurity: process.env.NODE_ENV === "production" ? undefined : false }));
  app.use("/api", (_request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  });
  app.use(originGuard(origins));
  app.use(cors({ origin: origins, methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"], maxAge: 600 }));
  app.use("/api", limits.api);
  app.use("/api/auth/login", limits.login);
  app.use("/api/auth/register", limits.register);
  app.use(express.json({ limit: "100kb", inflate: false }));
  app.use((request, response, next) => {
    if (["POST", "PATCH"].includes(request.method) && (!request.body || typeof request.body !== "object" || Array.isArray(request.body))) {
      return response.status(400).json({ message: "Envie um objeto JSON válido." });
    }
    next();
  });

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok", service: "webkore-api" });
  });

  app.use("/api/goals", goalsRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/legal", legalRouter);
  app.use("/api/teams", teamsRouter);
  app.use("/api/trainings", trainingsRouter);
  app.use("/api", (_request, response) => response.status(404).json({ message: "Endpoint não encontrado." }));
  app.use((error, _request, response, _next) => sendError(response, error));

  return app;
}
