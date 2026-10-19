import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, getAuthToken } from "../services/api.js";
import { authenticate, clearSession, restoreSession } from "../services/session.js";
import { changeCriterion, getTeamCriteria, metricCatalog } from "../../shared/criteria.js";
import { getApprovedAthletes } from "../utils/selectors.js";

const emptyState = () => ({ users: [], teams: [], memberships: [], trainings: [] });

export function useWebKoreData() {
  const [state, setState] = useState(emptyState);
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionMessage, setSessionMessage] = useState("");
  const mounted = useRef(false);
  const version = useRef(0);
  const inFlight = useRef(null);
  const authRequest = useRef(null);

  const applySession = useCallback((payload) => {
    setState(payload.state);
    setSession(payload.session);
    setSessionMessage("");
  }, []);

  const logout = useCallback(() => {
    version.current += 1;
    authRequest.current?.abort();
    inFlight.current = null;
    clearSession();
    if (mounted.current) {
      setSession(null);
      setState(emptyState());
      setSessionMessage("");
    }
  }, []);

  const refresh = useCallback(({ force = false, signal } = {}) => {
    if (!force && inFlight.current) return inFlight.current;
    const currentVersion = ++version.current;
    const token = getAuthToken();
    const request = restoreSession({ signal }).then((payload) => {
      if (mounted.current && currentVersion === version.current && token === getAuthToken() && payload) applySession(payload);
      return payload;
    }).catch((error) => {
      if (mounted.current && currentVersion === version.current && !signal?.aborted) {
        if (error instanceof ApiError && error.status === 401) logout();
        setSessionMessage(error.message);
      }
      throw error;
    }).finally(() => {
      if (inFlight.current === request) inFlight.current = null;
    });
    inFlight.current = request;
    return request;
  }, [applySession, logout]);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    refresh({ signal: controller.signal }).catch(() => undefined).finally(() => {
      if (!controller.signal.aborted) setLoadingSession(false);
    });
    return () => {
      mounted.current = false;
      version.current += 1;
      inFlight.current = null;
      controller.abort();
      authRequest.current?.abort();
    };
  }, [refresh]);

  useEffect(() => {
    const update = () => { if (getAuthToken() && !authRequest.current) refresh().catch(() => undefined); };
    const changedSession = (event) => {
      if (event.key !== "webkore-auth-token-v1") return;
      if (event.newValue) refresh({ force: true }).catch(() => undefined);
      else logout();
    };
    window.addEventListener("focus", update);
    window.addEventListener("storage", changedSession);
    return () => {
      window.removeEventListener("focus", update);
      window.removeEventListener("storage", changedSession);
    };
  }, [refresh, logout]);

  async function signIn(credentials, register = false) {
    const currentVersion = ++version.current;
    authRequest.current?.abort();
    const controller = new AbortController();
    authRequest.current = controller;
    try {
      const payload = await authenticate(credentials, register, { signal: controller.signal });
      if (mounted.current && currentVersion === version.current) applySession(payload);
    } finally {
      if (authRequest.current === controller) authRequest.current = null;
    }
  }

  async function mutate(operation) {
    const token = getAuthToken();
    try {
      const result = await operation();
      if (mounted.current && token === getAuthToken()) {
        // Uma operação confirmada não pode parecer malsucedida só porque a
        // consulta seguinte falhou: o aviso permite atualizar sem repetir a escrita.
        await refresh({ force: true }).catch((error) => {
          if (mounted.current && token === getAuthToken()) setSessionMessage(`Alteração salva. Não foi possível atualizar o painel: ${error.message}`);
        });
      }
      return result;
    } catch (error) {
      if (mounted.current && token === getAuthToken() && error instanceof ApiError && error.status === 401) {
        logout();
        setSessionMessage("Sua sessão expirou. Faça login novamente.");
      }
      throw error;
    }
  }

  function editCriterion(payload, operation) {
    const team = state.teams.find((item) => item.id === payload.teamId);
    if (!team) throw new Error("Equipe não encontrada.");
    return mutate(() => api.updateTeam(team.id, {
      ...changeCriterion(team, payload, operation, state.trainings.some((training) => training.teamId === team.id)),
      expectedUpdatedAt: team.updatedAt
    }));
  }

  const actions = {
    login: (credentials) => signIn(credentials),
    register: (credentials) => signIn(credentials, true),
    logout,
    refresh,
    updateTeam: ({ teamId, patch }) => mutate(() => api.updateTeam(teamId, patch)),
    addCriterion: (payload) => editCriterion(payload, "add"),
    removeCriterion: (payload) => editCriterion(payload, "remove"),
    renameCriterion: (payload) => editCriterion(payload, "rename"),
    deleteTeam: ({ teamId }) => mutate(() => api.deleteTeam(teamId)),
    updateUser: ({ patch }) => mutate(() => api.updateMe(patch)),
    async deleteUser() {
      const token = getAuthToken();
      await api.deleteMe();
      if (token === getAuthToken()) logout();
    },
    createTeam: ({ name, modality }) => mutate(() => api.createTeam({ name, modality })),
    requestJoin: ({ code }) => mutate(() => api.requestJoin(code)),
    respondRequest: ({ athleteId, teamId, status }) => mutate(() => api.respondRequest(teamId, athleteId, status)),
    updateAthlete: ({ athleteId, teamId, patch }) => mutate(() => teamId
      ? api.updateMembership(teamId, athleteId, patch) : api.updateMe(patch)),
    leaveTeam: ({ athleteId, teamId }) => mutate(() => api.deleteMembership(teamId, athleteId)),
    removeAthlete: ({ athleteId, teamId }) => mutate(() => api.deleteMembership(teamId, athleteId)),
    addTraining: ({ team, date, type, description }) => mutate(() => api.createTraining({
      teamId: team.id, date, type, description,
      records: getApprovedAthletes(state, team.id).map((athlete) => ({
        athleteId: athlete.id, present: true,
        metrics: Object.fromEntries(getTeamCriteria(team, "objective").map((name) => [name, 0])),
        ratings: Object.fromEntries(getTeamCriteria(team, "qualitative").slice(0, 4).map((name) => [name, 5]))
      }))
    })),
    updateTrainingAthlete: ({ trainingId, athleteId, patch }) => mutate(() => api.updateTrainingAthlete(trainingId, athleteId, patch)),
    deleteTraining: ({ trainingId }) => mutate(() => api.deleteTraining(trainingId))
  };
  return [{ ...state, metricCatalog, session, loadingSession, sessionMessage }, actions];
}
