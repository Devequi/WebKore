const API_BASE_URL = import.meta.env?.VITE_API_URL || "http://localhost:3333/api";
const TOKEN_KEY = "webkore-auth-token-v1";

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

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
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
      signal: options.signal || AbortSignal.timeout(10000)
    });
  } catch {
    throw new NetworkError();
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(data?.message || "Erro ao comunicar com a API.", response.status);
  }

  return data;
}

export const api = {
  async login(credentials) {
    const data = await request("/auth/login", {
      method: "POST",
      body: credentials
    });
    setAuthToken(data.token);
    return data;
  },

  async register(payload) {
    const data = await request("/auth/register", {
      method: "POST",
      body: payload
    });
    setAuthToken(data.token);
    return data;
  },

  me() {
    return request("/auth/me");
  },

  searchTeam(code) {
    return request(`/teams?code=${encodeURIComponent(code.trim())}`);
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
