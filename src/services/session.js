import bcrypt from "bcryptjs";
import { api, getAuthToken, NetworkError, setAuthToken } from "./api.js";
import { loadApiCache, loadState, saveApiCache, saveState } from "./storage.js";

const SESSION_KEY = "webkore-session-v1";

export function rememberSession(payload, source = "api") {
  const session = { userId: payload.user.id, role: payload.user.role, source };
  if (source === "api") saveApiCache(payload);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ...payload, session, offline: source === "local" };
}

export function clearSession() {
  setAuthToken(null);
  localStorage.removeItem(SESSION_KEY);
}

function tokenClaims(token) {
  try {
    return JSON.parse(atob(token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")));
  } catch {
    return null;
  }
}

export async function restoreSession() {
  let stored;
  try { stored = JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { stored = null; }
  const token = getAuthToken();
  if (token) {
    try {
      return rememberSession(await api.me());
    } catch (error) {
      const claims = tokenClaims(token);
      const cache = stored?.source === "api" ? loadApiCache(stored.userId) : null;
      if (error instanceof NetworkError && cache && claims?.id === stored.userId && claims.exp * 1000 > Date.now()) {
        return { ...cache, session: stored, offline: true };
      }
      if (!(error instanceof NetworkError)) clearSession();
      throw error;
    }
  }
  if (stored?.source === "local") {
    const state = loadState();
    const user = state.users.find((item) => item.id === stored.userId && item.passwordHash);
    if (user) return { user, state, session: stored, offline: true };
  }
  return null;
}

export async function authenticate(payload, register = false) {
  const credentials = { ...payload, email: payload.email.trim().toLowerCase() };
  try {
    const result = await (register ? api.register(credentials) : api.login(credentials));
    if (result.user.role !== payload.role) {
      clearSession();
      throw new Error("E-mail, senha ou perfil inválido.");
    }
    return rememberSession(result);
  } catch (error) {
    if (!(error instanceof NetworkError)) throw error;
    const state = loadState();
    let user = state.users.find((item) => item.email.toLowerCase() === credentials.email);
    if (register) {
      if (user) throw new Error("Já existe uma conta local com este e-mail.");
      if (!credentials.name?.trim() || !["coach", "athlete"].includes(credentials.role) || credentials.password?.length < 6) {
        throw new Error("Informe nome, perfil e uma senha de pelo menos 6 caracteres.");
      }
      user = {
        id: crypto.randomUUID(), role: credentials.role, name: credentials.name,
        email: credentials.email, passwordHash: await bcrypt.hash(credentials.password, 10),
        photo: credentials.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()
      };
      state.users = [...state.users, user];
      saveState(state);
    } else if (!user?.passwordHash || user.role !== credentials.role || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
      throw new Error("API indisponível. Nenhuma conta local válida foi encontrada; dados antigos foram preservados.");
    }
    setAuthToken(null);
    return rememberSession({ user, state }, "local");
  }
}
