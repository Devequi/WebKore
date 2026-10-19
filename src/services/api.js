import { getAuthToken } from "./storage.js";
export { getAuthToken, setAuthToken } from "./storage.js";

const API_BASE_URL = import.meta.env?.VITE_API_URL || "http://localhost:3333/api";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor() {
    super("Não foi possível conectar à API. Verifique sua conexão e o servidor.");
    this.name = "NetworkError";
  }
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000)
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new NetworkError();
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(data?.message || "Erro ao comunicar com a API.", response.status);
  }

  if (data === null) throw new ApiError("O servidor retornou uma resposta inválida. Tente novamente.", 502);

  return data;
}

export const api = {
  login(credentials, options) {
    return request("/auth/login", {
      method: "POST",
      body: credentials,
      ...options
    });
  },

  register(payload, options) {
    return request("/auth/register", {
      method: "POST",
      body: payload,
      ...options
    });
  },

  me(options) {
    return request("/auth/me", options);
  },

  searchTeam(code, options) {
    return request(`/teams?code=${encodeURIComponent(code.trim())}`, options);
  },

  updateMe(patch) {
    return request("/auth/me", {
      method: "PATCH",
      body: patch
    });
  },

  deleteMe() {
    return request("/auth/me", {
      method: "DELETE"
    });
  },

  createTeam(payload) {
    return request("/teams", {
      method: "POST",
      body: payload
    });
  },

  updateTeam(teamId, patch) {
    return request(`/teams/${teamId}`, {
      method: "PATCH",
      body: patch
    });
  },

  deleteTeam(teamId) {
    return request(`/teams/${teamId}`, {
      method: "DELETE"
    });
  },

  requestJoin(code) {
    return request("/teams/join", {
      method: "POST",
      body: { code }
    });
  },

  respondRequest(teamId, athleteId, status) {
    return request(`/teams/${teamId}/requests/${athleteId}`, {
      method: "PATCH",
      body: { status }
    });
  },

  updateMembership(teamId, athleteId, patch) {
    return request(`/teams/${teamId}/athletes/${athleteId}`, {
      method: "PATCH",
      body: patch
    });
  },

  deleteMembership(teamId, athleteId) {
    return request(`/teams/${teamId}/athletes/${athleteId}`, {
      method: "DELETE"
    });
  },

  createTraining(payload) {
    return request("/trainings", {
      method: "POST",
      body: payload
    });
  },

  updateTrainingAthlete(trainingId, athleteId, patch) {
    return request(`/trainings/${trainingId}/athletes/${athleteId}`, {
      method: "PATCH",
      body: patch
    });
  },

  deleteTraining(trainingId) {
    return request(`/trainings/${trainingId}`, {
      method: "DELETE"
    });
  }
};
