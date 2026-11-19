import { createApp } from "./src/aplicativo.js";
import "./src/lib/environment.js";

const port = Number(process.env.PORT || 3333);
const host = process.env.HOST || "127.0.0.1";
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error("PORT inválida.");
const app = createApp();

app.listen(port, host, () => {
  console.log(`WebKore API running on http://${host}:${port}`);
});
