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
  return secret;
}
