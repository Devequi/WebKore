import { createApp } from "./src/app.js";
import "./src/config/environment.js";

const port = Number(process.env.PORT || 3333);
const host = process.env.HOST || "127.0.0.1";
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error("PORT inválida.");
const app = createApp();

const server = app.listen(port, host, () => {
  console.log(`WebKore API running on http://${host}:${port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`A porta ${port} já está em uso em ${host}. Encerre a outra instância da API ou configure uma porta livre em PORT.`);
  } else {
    console.error(`Não foi possível iniciar a API: ${error.message}`);
  }
  process.exitCode = 1;
});
