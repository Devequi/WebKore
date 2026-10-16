import { initialData } from "../data/seedData.js";
import bcrypt from "bcryptjs";
import { canonicalCriterion, normalizeModality } from "../../shared/criteria.js";

const STORAGE_KEY = "webkore-state-v2";

function withoutDeprecatedProfileFields(state) {
  if (!state || !["users", "teams", "memberships", "trainings"].every((field) => Array.isArray(state[field]))) {
    throw new Error("Os dados locais não puderam ser lidos. Eles foram preservados para recuperação.");
  }
  return {
    ...state,
    teams: state.teams.map((team) => normalizeModality(team.modality)
      ? { ...team, modality: normalizeModality(team.modality) } : team),
    trainings: state.trainings.map((training) => ({ ...training,
      athletes: Object.fromEntries(Object.entries(training.athletes || {}).map(([id, record]) => {
        const ratings = { ...record.ratings };
        for (const [name, value] of Object.entries(record.ratings || {})) {
          const canonical = canonicalCriterion(name);
          // Uma colisão antiga permanece intacta para não descartar uma nota.
          if (canonical !== name && !Object.hasOwn(ratings, canonical)) {
            ratings[canonical] = value;
            delete ratings[name];
          }
        }
        return [id, { ...record, ratings }];
      }))
    })),
    users: state.users.map(({ age: _age, password, ...user }) => ({
      ...user,
      ...(typeof password === "string" && password ? { passwordHash: bcrypt.hashSync(password, 10) } : {})
    }))
  };
}

export function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  const state = withoutDeprecatedProfileFields(stored ? JSON.parse(stored) : initialData);
  // Converte somente credenciais antigas; contas, equipes e históricos ficam intactos.
  if (stored && stored !== JSON.stringify(state)) saveState(state);
  return state;
}

export function loadStateForStartup() {
  try { return { state: loadState(), notice: "" }; }
  catch {
    // Permite usar a API sem gravar por cima de uma base local ilegível.
    return { state: initialData, notice: "Os dados locais não puderam ser lidos e foram preservados. O modo local está indisponível; você pode entrar pela API." };
  }
}

export function saveApiCache(payload) {
  const cleanState = {
    ...payload.state,
    users: payload.state.users.map(({ password: _password, passwordHash: _hash, ...user }) => user)
  };
  localStorage.setItem(`webkore-api-state-v1:${payload.user.id}`, JSON.stringify({ user: payload.user, state: cleanState }));
}

export function loadApiCache(userId) {
  try {
    const payload = JSON.parse(localStorage.getItem(`webkore-api-state-v1:${userId}`));
    return payload?.user?.id === userId ? payload : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutDeprecatedProfileFields(state)));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  return withoutDeprecatedProfileFields(initialData);
}
