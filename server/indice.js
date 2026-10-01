import { createApp } from "./src/aplicativo.js";
import "./src/lib/environment.js";

const port = Number(process.env.PORT || 3333);
const app = createApp();

app.listen(port, () => {
  console.log(`WebKore API running on http://localhost:${port}`);
});
