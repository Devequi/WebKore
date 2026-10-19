import cors from "cors";
import express from "express";
import { getJwtSecret } from "./lib/environment.js";
import { sendError } from "./lib/validacao.js";
import { authRouter } from "./rotas/autenticacao.rotas.js";
import { teamsRouter } from "./rotas/times.rotas.js";
import { trainingsRouter } from "./rotas/treinamentos.rotas.js";

export function createApp() {
  getJwtSecret();
  const app = express();
  app.disable("x-powered-by");

  app.use(cors());
  app.use(express.json());
  app.use("/api", (_request, response, next) => {
    response.set("Cache-Control", "no-store");
    next();
  });
  app.use((request, response, next) => {
    if (["POST", "PATCH"].includes(request.method) && (!request.body || typeof request.body !== "object" || Array.isArray(request.body))) {
      return response.status(400).json({ message: "Envie um objeto JSON válido." });
    }
    next();
  });

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok", service: "webkore-api" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/teams", teamsRouter);
  app.use("/api/trainings", trainingsRouter);
  app.use("/api", (_request, response) => response.status(404).json({ message: "Endpoint não encontrado." }));
  app.use((error, _request, response, _next) => sendError(response, error));

  return app;
}
