import { validateBirthDate } from "../../../shared/birthDate.js";

export function birthDate(value) {
  try {
    return new Date(`${validateBirthDate(value)}T00:00:00.000Z`);
  } catch (error) {
    throw new HttpError(400, error.message);
  }
}

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function text(value, label, { empty = false, max = 191 } = {}) {
  if (typeof value !== "string" || (!empty && !value.trim()) || value.length > max) throw new HttpError(400, `${label} inválido.`);
  return value.trim();
}

export function email(value) {
  const normalized = text(value, "E-mail").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new HttpError(400, "E-mail inválido.");
  return normalized;
}

export function password(value, newPassword = false) {
  if (typeof value !== "string" || value.length < (newPassword ? 6 : 1) || value.length > 4096 ||
    (newPassword && Buffer.byteLength(value, "utf8") > 72)) throw new HttpError(400, "Senha inválida. Use pelo menos 6 caracteres e no máximo 72 bytes para uma nova senha.");
  return value;
}

export function id(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,191}$/.test(value)) throw new HttpError(400, "ID inválido.");
  return value;
}

export function validateParam(request, response, next, value) {
  try { id(value); next(); } catch (error) { sendError(response, error); }
}

export function integer(value, label, { min = 0, max = 2147483647, string = false } = {}) {
  if (string && typeof value === "string" && /^\d+$/.test(value.trim())) value = Number(value);
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) throw new HttpError(400, `${label} inválido.`);
  return value;
}

export function validateNotes(values, keys) {
  if (!values || typeof values !== "object" || Array.isArray(values)) throw new HttpError(400, "Avaliações inválidas.");
  for (const [key, value] of Object.entries(values)) {
    if (keys && !keys.includes(key)) throw new HttpError(400, "Campo de avaliação inválido.");
    integer(value, "Nota", { max: 10 });
  }
}

export function validateMetrics(metrics) {
  if (!metrics || typeof metrics !== "object") throw new HttpError(400, "Métricas inválidas.");
  const entries = Array.isArray(metrics) ? metrics.map((metric) => {
    if (!metric || typeof metric !== "object") throw new HttpError(400, "Métrica inválida.");
    return [metric.name, metric.value];
  }) : Object.entries(metrics);
  const names = new Set();
  for (const [name, value] of entries) {
    text(name, "Nome da métrica");
    if (names.has(name)) throw new HttpError(400, "Métrica repetida.");
    names.add(name);
    integer(value, "Métrica");
  }
}

export function validatePresence(value) {
  if (value !== undefined && typeof value !== "boolean") throw new HttpError(400, "Presença deve ser true ou false.");
}

export function date(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) || !Number.isFinite(new Date(value).getTime()) ||
    new Date(`${value.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) !== value.slice(0, 10)) throw new HttpError(400, "Data inválida.");
  return new Date(value);
}

export function sendError(response, error, fallback = "Erro inesperado ao processar a requisição.") {
  const status = error instanceof HttpError ? error.status
    : error.code === "P2002" || error.code === "P2034" ? 409 : error.code === "P2025" ? 404 : error.code === "P2003" ? 409
    : error.code === "P2000" || error.name === "PrismaClientValidationError" || error.type === "entity.parse.failed" ? 400
    : error.type === "entity.too.large" ? 413 : 500;
  const message = error instanceof HttpError ? error.message
    : status === 409 ? "Os dados entram em conflito com um registro existente."
    : status === 404 ? "Registro não encontrado."
    : status === 400 ? "Dados da requisição inválidos."
    : status === 413 ? "Requisição muito grande." : fallback;
  if (status === 500) console.error(fallback, error.code || error.name);
  return response.status(status).json({ message });
}
