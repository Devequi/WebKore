import { rateLimit } from "express-rate-limit";
import { HttpError } from "./validacao.js";
import { randomUUID } from "node:crypto";

export function securityEvents(request, response, next) {
  const requestId = randomUUID();
  response.set("X-Request-ID", requestId);
  response.once("finish", () => {
    if (process.env.NODE_ENV !== "production" && process.env.SECURITY_LOGS !== "1") return;
    if (!request.path.startsWith("/api") || !["POST", "PATCH", "DELETE"].includes(request.method)) return;
    // Somente metadados. Nunca corpo, query, Authorization, senha ou e-mail.
    console.info(JSON.stringify({ event: "api_write", time: new Date().toISOString(), requestId,
      method: request.method, route: request.route?.path || "unmatched", status: response.statusCode,
      ...(request.user ? { userId: request.user.id } : {}) }));
  });
  next();
}

function limit(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} deve ser inteiro positivo.`);
  return value;
}

export function allowedOrigins() {
  const configured = process.env.APP_ORIGINS;
  if (process.env.NODE_ENV === "production" && !configured) throw new Error("Configure APP_ORIGINS em produção.");
  return (configured || "http://localhost:5173,http://127.0.0.1:5173").split(",").map((entry) => {
    const origin = entry.trim();
    const url = new URL(origin);
    if (url.origin !== origin || !["http:", "https:"].includes(url.protocol) ||
        (process.env.NODE_ENV === "production" && url.protocol !== "https:")) throw new Error("APP_ORIGINS deve conter origens exatas; em produção utilize HTTPS.");
    return origin;
  });
}

export function originGuard(origins) {
  return (request, _response, next) => {
    const origin = request.get("Origin");
    if (origin && !origins.includes(origin)) return next(new HttpError(403, "Origem não autorizada."));
    next();
  };
}

export function authenticationLimiters() {
  const options = { windowMs: 15 * 60 * 1000, standardHeaders: "draft-8", legacyHeaders: false,
    message: { message: "Muitas tentativas. Aguarde antes de tentar novamente." } };
  return {
    login: rateLimit({ ...options, limit: limit("AUTH_LOGIN_LIMIT", 20) }),
    register: rateLimit({ ...options, limit: limit("AUTH_REGISTER_LIMIT", 10) }),
    api: rateLimit({ ...options, limit: limit("API_RATE_LIMIT", 3000) })
  };
}
