import { useCallback, useEffect, useMemo, useState } from "react";
import bcrypt from "bcryptjs";
import { initialData, metricCatalog } from "../data/seedData.js";
import { enqueueOfflineAction, readQueue } from "../services/offlineQueue.js";
import { api, ApiError, getAuthToken, NetworkError } from "../services/api.js";
import { authenticate, clearSession, restoreSession } from "../services/session.js";
import { loadStateForStartup, resetState, saveState } from "../services/storage.js";
import { getApprovedAthletes } from "../utils/selectors.js";
import { changeCriterion, criteriaError, defaultQualitativeCriteria, evaluationFromRatings, getTeamCriteria, normalizeModality, qualitativeFields } from "../../shared/criteria.js";
import { joinedStatus, membershipPatch, normalizeTeamCode } from "../../shared/contracts.js";
import { validateBirthDate } from "../../shared/birthDate.js";

function makeMetrics(modality) {
  return Object.fromEntries((metricCatalog[modality] || metricCatalog.Futsal).map((metric) => [metric, 0]));
}

export function useWebKoreData() {
  const [startup] = useState(loadStateForStartup);
  const [state, setState] = useState(startup.state);
  const [syncQueue, setSyncQueue] = useState(readQueue);
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [offline, setOffline] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");

  const applySession = useCallback((payload) => {
    setState(payload.state);
    setSession(payload.session);
    setOffline(payload.offline);
    setSessionMessage("");
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    setState(loadStateForStartup().state);
    setOffline(false);
  }, []);

  const refresh = useCallback(async () => {
    const token = getAuthToken();
    try {
      const payload = await restoreSession();
      if (payload && token === getAuthToken()) applySession(payload);
      return payload;
    } catch (error) {
      if (error instanceof ApiError && [401, 404].includes(error.status)) {
        logout();
        setSessionMessage("Sua sessão não é mais válida. Faça login novamente.");
      }
      throw error;
    }
  }, [applySession, logout]);

  useEffect(() => {
    let active = true;
    const token = getAuthToken();
    restoreSession().then((payload) => {
      if (active && payload && token === getAuthToken()) applySession(payload);
    }).catch((error) => {
      if (active) setSessionMessage(error instanceof ApiError ? "Sua sessão não é mais válida. Faça login novamente." : error.message);
    }).finally(() => { if (active) setLoadingSession(false); });
    return () => { active = false; };
  }, [applySession]);

  async function mutateApi(operation) {
    try {
      const result = await operation();
      await refresh();
      return result;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        setSessionMessage("Sua sessão expirou. Faça login novamente.");
      }
      if (error instanceof NetworkError) setOffline(true);
      throw error;
    }
  }

  function updateTeam({ teamId, patch }) {
    const team = state.teams.find((item) => item.id === teamId);
    if (!team || team.coachId !== session?.userId || session?.role !== "coach") throw new Error("Você não tem permissão para editar esta equipe.");
    const allowed = ["name", "modality", "objectiveCriteria", "qualitativeCriteria"];
    const data = Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key)));
    if (data.modality !== undefined) {
      data.modality = normalizeModality(data.modality);
      if (!data.modality) throw new Error("Modalidade inválida.");
    }
    if (data.name !== undefined && (typeof data.name !== "string" || !data.name.trim())) throw new Error("Informe o nome da equipe.");
    for (const kind of ["objective", "qualitative"]) {
      if (data[`${kind}Criteria`] !== undefined) {
        const error = criteriaError(data[`${kind}Criteria`], kind);
        if (error) throw new Error(error);
      }
    }
    if (session.source === "api") return mutateApi(() => api.updateTeam(teamId, data));
    const hasTrainings = state.trainings.some((training) => training.teamId === teamId);
    if (hasTrainings && data.qualitativeCriteria?.length < Math.min(getTeamCriteria(team, "qualitative").length, 4)) throw new Error("Um critério qualitativo usado em treinos não pode ser removido. Renomeie-o para preservar as notas.");
    const renamed = (kind) => {
      const previous = getTeamCriteria(team, kind);
      const next = data[`${kind}Criteria`];
      return next?.length === previous.length ? previous.map((name, index) => [name, next[index]]) : [];
    };
    for (const [previousName, nextName] of renamed("objective")) {
      if (previousName !== nextName && state.trainings.some((training) => training.teamId === teamId &&
        Object.values(training.athletes).some((record) => Object.hasOwn(record.metrics, previousName) && Object.hasOwn(record.metrics, nextName)))) {
        throw new Error("O nome do critério já existe no histórico. Nenhuma alteração foi aplicada.");
      }
    }
    setState((current) => ({
      ...current,
      teams: current.teams.map((item) => item.id === teamId ? { ...item, ...data } : item),
      trainings: current.trainings.map((training) => training.teamId !== teamId ? training : {
        ...training,
        athletes: Object.fromEntries(Object.entries(training.athletes).map(([id, record]) => {
          const remap = (values, kind) => Object.fromEntries(Object.entries(values).map(([name, value]) => [renamed(kind).find(([old]) => old === name)?.[1] || name, value]));
          return [id, { ...record, metrics: remap(record.metrics, "objective"), ratings: remap(record.ratings, "qualitative") }];
        }))
      })
    }));
  }

  function editCriterion(payload, operation) {
    const team = state.teams.find((item) => item.id === payload.teamId);
    if (!team) throw new Error("Equipe não encontrada.");
    return updateTeam({ teamId: team.id, patch: changeCriterion(team, payload, operation,
      state.trainings.some((training) => training.teamId === team.id)) });
  }

  useEffect(() => {
    if (session?.source === "local" && !startup.notice) saveState(state);
  }, [state, session]);

  useEffect(() => {
    const sync = () => {
      if (session?.source === "api") refresh().catch(() => undefined);
      else setSyncQueue(readQueue());
    };
    window.addEventListener("online", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("focus", sync);
    };
  }, [session?.source, refresh]);

  const actions = useMemo(
    () => ({
      async login(credentials) {
        applySession(await authenticate(credentials));
      },
      async register(payload) {
        applySession(await authenticate(payload, true));
      },
      logout,
      refresh,
      updateTeam,
      addCriterion: (payload) => editCriterion(payload, "add"),
      removeCriterion: (payload) => editCriterion(payload, "remove"),
      renameCriterion: (payload) => editCriterion(payload, "rename"),
      deleteTeam({ teamId }) {
        const team = state.teams.find((item) => item.id === teamId);
        if (!team || team.coachId !== session?.userId || session?.role !== "coach") throw new Error("Você não tem permissão para excluir esta equipe.");
        if (session.source === "api") return mutateApi(() => api.deleteTeam(teamId));
        setState((current) => ({ ...current,
          teams: current.teams.filter((item) => item.id !== teamId),
          memberships: current.memberships.filter((item) => item.teamId !== teamId),
          trainings: current.trainings.filter((item) => item.teamId !== teamId)
        }));
      },
      async updateUser({ userId, patch }) {
        if (patch.birthDate !== undefined) validateBirthDate(patch.birthDate);
        if (session?.source === "api") return mutateApi(() => api.updateMe(patch));
        const { password, ...fields } = patch;
        const safePatch = { ...fields, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) };
        setState((current) => ({
          ...current,
          users: current.users.map((user) => (user.id === userId ? { ...user, ...safePatch } : user))
        }));
      },
      async deleteUser({ userId }) {
        if (session?.source === "api") {
          await api.deleteMe();
          logout();
          return;
        }
        setState((current) => {
          const user = current.users.find((item) => item.id === userId);
          const removedTeamIds =
            user?.role === "coach" ? current.teams.filter((team) => team.coachId === userId).map((team) => team.id) : [];
          return {
            ...current,
            users: current.users.filter((item) => item.id !== userId),
            teams: current.teams.filter((team) => !removedTeamIds.includes(team.id)),
            memberships: current.memberships.filter(
              (membership) => membership.athleteId !== userId && !removedTeamIds.includes(membership.teamId)
            ),
            trainings: current.trainings
              .filter((training) => !removedTeamIds.includes(training.teamId))
              .map((training) => {
                const { [userId]: _removed, ...athletes } = training.athletes;
                return { ...training, athletes };
              })
          };
        });
      },
      createTeam({ name, modality, coachId }) {
        modality = normalizeModality(modality);
        if (!modality || !name?.trim()) throw new Error("Informe nome e modalidade da equipe.");
        if (session?.source === "api") return mutateApi(() => api.createTeam({ name, modality }));
        const code = `WK-TEAM-${Math.floor(100 + Math.random() * 900)}`;
        setState((current) => ({
          ...current,
          teams: [
            ...current.teams,
            {
              id: crypto.randomUUID(),
              name,
              modality,
              code,
              coachId,
              objectiveCriteria: metricCatalog[modality] || metricCatalog.Futsal,
              qualitativeCriteria: defaultQualitativeCriteria
            }
          ]
        }));
      },
      requestJoin({ athleteId, code }) {
        code = normalizeTeamCode(code);
        if (session?.source === "api") return mutateApi(() => api.requestJoin(code));
        if (!state.teams.some((team) => normalizeTeamCode(team.code) === code)) throw new Error("Equipe não encontrada.");
        setState((current) => {
          const team = current.teams.find((item) => normalizeTeamCode(item.code) === code);
          if (!team) return current;
          const exists = current.memberships.some(
            (membership) => membership.athleteId === athleteId && membership.teamId === team.id
          );
          if (exists) {
            return {
              ...current,
              memberships: current.memberships.map((membership) =>
                membership.athleteId === athleteId && membership.teamId === team.id
                  ? { ...membership, status: joinedStatus(membership.status) }
                  : membership
              )
            };
          }

          return {
            ...current,
            memberships: [...current.memberships, { athleteId, teamId: team.id, status: "pending" }]
          };
        });
      },
      respondRequest({ athleteId, teamId, status }) {
        status = typeof status === "string" ? status.trim().toLowerCase() : "";
        if (!["pending", "approved", "rejected"].includes(status)) throw new Error("Status inválido.");
        if (session?.source === "api") return mutateApi(() => api.respondRequest(teamId, athleteId, status));
        setState((current) => ({
          ...current,
          memberships: current.memberships.map((membership) =>
            membership.athleteId === athleteId && membership.teamId === teamId ? { ...membership, status } : membership
          )
        }));
      },
      updateAthlete({ athleteId, teamId, patch }) {
        if (!teamId && patch.birthDate !== undefined) validateBirthDate(patch.birthDate);
        if (session?.source === "api") return mutateApi(() => teamId
          ? api.updateMembership(teamId, athleteId, patch)
          : api.updateMe(patch));
        if (teamId) {
          const data = membershipPatch(patch);
          setState((current) => ({ ...current, memberships: current.memberships.map((item) =>
            item.teamId === teamId && item.athleteId === athleteId ? { ...item, ...data } : item) }));
          return;
        }
        setState((current) => ({
          ...current,
          users: current.users.map((user) => (user.id === athleteId ? { ...user, ...patch } : user))
        }));
      },
      leaveTeam({ athleteId, teamId }) {
        if (session?.source === "api") return mutateApi(() => api.deleteMembership(teamId, athleteId));
        setState((current) => ({
          ...current,
          memberships: current.memberships.filter(
            (membership) => !(membership.athleteId === athleteId && membership.teamId === teamId)
          )
        }));
      },
      removeAthlete({ athleteId, teamId }) {
        if (session?.source === "api") return mutateApi(() => api.deleteMembership(teamId, athleteId));
        setState((current) => ({
          ...current,
          memberships: current.memberships.filter(
            (membership) => !(membership.athleteId === athleteId && membership.teamId === teamId)
          )
        }));
      },
      addTraining({ team, date, type, description }) {
        if (session?.source === "api") return mutateApi(() => api.createTraining({
          teamId: team.id, date, type, description,
          records: getApprovedAthletes(state, team.id).map((athlete) => ({
            athleteId: athlete.id, present: true, metrics: makeMetrics(team.modality),
            ratings: Object.fromEntries(getTeamCriteria(team, "qualitative").slice(0, 4).map((name) => [name, 5]))
          }))
        }));
        const id = crypto.randomUUID();
        setState((current) => {
          const athletes = getApprovedAthletes(current, team.id);
          const athleteEntries = Object.fromEntries(
            athletes.map((athlete) => [
              athlete.id,
              { present: true, metrics: makeMetrics(team.modality), ratings: Object.fromEntries(getTeamCriteria(team, "qualitative").slice(0, 4).map((name) => [name, 5])) }
            ])
          );
          const training = {
            id,
            teamId: team.id,
            date,
            type,
            description,
            athletes: athleteEntries
          };
          setSyncQueue(enqueueOfflineAction({ type: "training.created", payload: training }));
          return { ...current, trainings: [training, ...current.trainings] };
        });
        return id;
      },
      updateTrainingAthlete({ trainingId, athleteId, patch }) {
        const training = state.trainings.find((item) => item.id === trainingId);
        const team = state.teams.find((item) => item.id === training?.teamId);
        if (!training?.athletes[athleteId] || !team) throw new Error("Registro de treino não encontrado.");
        if (patch.ratings !== undefined) {
          const evaluation = evaluationFromRatings(patch.ratings, team, false);
          const criteria = getTeamCriteria(team, "qualitative").slice(0, 4);
          patch = { ...patch, ratings: Object.fromEntries(criteria.flatMap((name, index) =>
            Object.hasOwn(evaluation, qualitativeFields[index]) ? [[name, evaluation[qualitativeFields[index]]]] : [])) };
        }
        if (session?.source === "api") return mutateApi(() => api.updateTrainingAthlete(trainingId, athleteId, patch));
        setState((current) => ({
          ...current,
          trainings: current.trainings.map((training) => {
            if (training.id !== trainingId) return training;
            const athleteRecord = training.athletes[athleteId];
            const updatedAthlete = {
              ...athleteRecord,
              ...patch,
              metrics: { ...athleteRecord.metrics, ...patch.metrics },
              ratings: { ...athleteRecord.ratings, ...patch.ratings }
            };
            const updatedTraining = {
              ...training,
              athletes: { ...training.athletes, [athleteId]: updatedAthlete }
            };
            setSyncQueue(enqueueOfflineAction({ type: "training.updated", payload: { trainingId, athleteId, patch } }));
            return updatedTraining;
          })
        }));
      },
      deleteTraining({ trainingId }) {
        if (session?.source === "api") return mutateApi(() => api.deleteTraining(trainingId));
        setState((current) => ({
          ...current,
          trainings: current.trainings.filter((training) => training.id !== trainingId)
        }));
      },
      resetDemo() {
        setState(resetState());
        localStorage.removeItem("webkore-offline-queue-v1");
        setSyncQueue([]);
      }
    }),
    [state, session, applySession, logout, refresh]
  );

  return [{ ...state, syncQueue, metricCatalog: initialData.metricCatalog || metricCatalog,
    session, loadingSession, offline, sessionMessage, localDataNotice: startup.notice }, actions];
}
