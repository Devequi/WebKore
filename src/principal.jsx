import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles/global.css";
import { ErrorFallback } from "./componentes/ErrorFallback.jsx";
import { retireLegacyPwa } from "./services/retirePwa.js";
import { removeLegacyApiCache } from "./services/storage.js";

try { removeLegacyApiCache(); }
catch { console.warn("Não foi possível limpar o cache de consultas antigo."); }

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorFallback>
      <App />
    </ErrorFallback>
  </React.StrictMode>
);

retireLegacyPwa({
  serviceWorker: navigator.serviceWorker,
  cacheStorage: window.caches,
  baseUrl: new URL(import.meta.env.BASE_URL, window.location.origin).href
}).then(({ controlled, removed }) => {
  // Uma navegação libera o controlador antigo após desregistro; só ocorre uma vez.
  if (controlled && removed) window.location.reload();
}).catch(() => console.warn("Não foi possível desativar o PWA antigo. Feche as outras abas do WebKore e atualize a página."));
