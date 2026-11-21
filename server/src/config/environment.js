import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

// Mantém variáveis já fornecidas pelo ambiente e aceita execução sem .env.
try {
  loadEnvFile(fileURLToPath(new URL("../../../.env", import.meta.url)));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret?.trim()) {
    throw new Error("Configure JWT_SECRET no ambiente ou no arquivo .env antes de iniciar a API.");
  }
  if (process.env.NODE_ENV === "production" && (Buffer.byteLength(secret) < 32 || /^(change|replace|example|secret|test)/i.test(secret))) {
    throw new Error("JWT_SECRET de produção deve ser aleatório, exclusivo e ter no mínimo 32 bytes.");
  }
  return secret;
}
