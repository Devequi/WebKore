import { validateBirthDate } from "../../shared/birthDate.js";
import { api, ApiError, getAuthToken, setAuthToken } from "./api.js";

export function rememberSession(payload) {
  const user = payload?.user;
  const state = payload?.state;
  if (!user?.id || !["coach", "athlete"].includes(user.role) ||
      !["users", "teams", "memberships", "trainings"].every((key) => Array.isArray(state?.[key])) ||
      !state.users.some((item) => item?.id === user.id)) {
    throw new ApiError("O servidor retornou uma sessão incompleta. Tente novamente.", 502);
  }
  return { ...payload, session: { userId: user.id, role: user.role } };
}

export function clearSession() {
  setAuthToken(null);
}

export async function restoreSession(options) {
  const token = getAuthToken();
  if (!token) return null;
  try {
    return rememberSession(await api.me(options));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && token === getAuthToken()) clearSession();
    throw error;
  }
}

export async function authenticate(payload, register = false, options) {
  const credentials = { ...payload, email: payload.email.trim().toLowerCase() };
  if (register && credentials.role === "athlete") validateBirthDate(credentials.birthDate);
  const result = await (register ? api.register(credentials, options) : api.login(credentials, options));
  const session = rememberSession(result);
  if (result.user.role !== payload.role || typeof result.token !== "string" || !result.token) {
    throw new ApiError("E-mail, senha ou perfil inválido.", 401);
  }
  options?.signal?.throwIfAborted();
  setAuthToken(result.token);
  return session;
}
