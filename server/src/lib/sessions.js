import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma.js";
import { getJwtSecret } from "./environment.js";

export const tokenOptions = { algorithms: ["HS256"], issuer: "webkore-api", audience: "webkore-app" };

export function getSessionSeconds() {
  const seconds = Number(process.env.AUTH_SESSION_SECONDS || 86400);
  if (!Number.isSafeInteger(seconds) || seconds < 300 || seconds > 604800) throw new Error("AUTH_SESSION_SECONDS deve estar entre 300 e 604800.");
  return seconds;
}

export async function issueSession(user) {
  const seconds = getSessionSeconds();
  const id = randomUUID();
  const token = jwt.sign({ id: user.id, role: user.role, ver: user.authVersion }, getJwtSecret(), {
    algorithm: "HS256", issuer: tokenOptions.issuer, audience: tokenOptions.audience,
    jwtid: id, expiresIn: seconds
  });
  await prisma.authSession.create({ data: { id, userId: user.id, expiresAt: new Date(jwt.decode(token).exp * 1000) } });
  // Limpeza indexada e limitada à conta, sem armazenar tokens em claro.
  await prisma.authSession.deleteMany({ where: { userId: user.id, expiresAt: { lte: new Date() } } });
  return token;
}
