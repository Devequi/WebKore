import jwt from "jsonwebtoken";
import { getJwtSecret } from "../lib/environment.js";
import { prisma } from "../lib/prisma.js";
import { sendError } from "../lib/validacao.js";

export async function requireAuth(request, response, next) {
  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return response.status(401).json({ message: "Token não informado." });
  }

  let claims;
  try {
    claims = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
    if (typeof claims.id !== "string" || !/^[A-Za-z0-9_-]{1,191}$/.test(claims.id) || !["COACH", "ATHLETE"].includes(claims.role)) throw new Error("Claims inválidas");
  } catch {
    return response.status(401).json({ message: "Token inválido." });
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: claims.id }, select: { id: true, role: true } });
    if (!user || user.role !== claims.role) return response.status(401).json({ message: "Sessão inválida. Entre novamente." });
    request.user = user;
    return next();
  } catch (error) { return sendError(response, error, "Erro ao validar sessão."); }
}
