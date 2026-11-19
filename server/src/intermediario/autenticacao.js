import jwt from "jsonwebtoken";
import { getJwtSecret } from "../lib/environment.js";
import { prisma } from "../lib/prisma.js";
import { sendError } from "../lib/validacao.js";
import { tokenOptions } from "../lib/sessions.js";

export async function requireAuth(request, response, next) {
  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return response.status(401).json({ message: "Token não informado." });
  }

  let claims;
  try {
    claims = jwt.verify(token, getJwtSecret(), tokenOptions);
    if (!Number.isSafeInteger(claims.exp) || typeof claims.id !== "string" ||
      !/^[A-Za-z0-9_-]{1,191}$/.test(claims.id) || !["COACH", "ATHLETE"].includes(claims.role) ||
      !Number.isSafeInteger(claims.ver) || claims.ver < 0 || typeof claims.jti !== "string" ||
      !/^[a-f0-9-]{36}$/.test(claims.jti)) {
      throw new Error("Claims inválidas");
    }
  } catch {
    return response.status(401).json({ message: "Token inválido." });
  }
  try {
    const session = await prisma.authSession.findUnique({ where: { id: claims.jti }, include: { user: { select: { id: true, role: true, authVersion: true } } } });
    const user = session?.user;
    if (!user || session.userId !== claims.id || session.expiresAt <= new Date() || user.role !== claims.role || user.authVersion !== claims.ver) return response.status(401).json({ message: "Sessão inválida. Entre novamente." });
    request.user = user;
    request.sessionId = claims.jti;
    return next();
  } catch (error) { return sendError(response, error, "Erro ao validar sessão."); }
}
