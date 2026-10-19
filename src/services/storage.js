const TOKEN_KEY = "webkore-auth-token-v1";

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Remove somente cópias de consulta. Bases locais e filas antigas ficam intactas
// para recuperação manual; nunca são utilizadas como substitutas do servidor.
export function removeLegacyApiCache(storage = localStorage) {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index));
  for (const key of keys) {
    if (key?.startsWith("webkore-api-state-v1:")) storage.removeItem(key);
  }
  storage.removeItem("webkore-session-v1");
}
