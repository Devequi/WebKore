import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles/global.css";
import { ErrorFallback } from "./componentes/ErrorFallback.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorFallback>
      <App />
    </ErrorFallback>
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // O vite-plugin-pwa injeta o registro do service worker no build.
    if (import.meta.env.PROD) return;

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    if ("caches" in window) {
      window.caches
        .keys()
        .then((keys) => keys.filter((key) => key.startsWith("webkore-cache")).forEach((key) => window.caches.delete(key)))
        .catch(() => undefined);
    }
  });
}
