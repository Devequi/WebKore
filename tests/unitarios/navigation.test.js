import assert from "node:assert/strict";
import test from "node:test";
import { parseRoute, routePath, routeError } from "../../src/app/navigation.js";

const coach = { userId: "c1", role: "coach" };
const athlete = { userId: "a1", role: "athlete" };
const state = { teams: [{ id: "t1", coachId: "c1" }, { id: "t2", coachId: "c2" }],
  memberships: [{ teamId: "t1", athleteId: "a1", status: "approved" },
    { teamId: "t2", athleteId: "a1", status: "pending" }],
  trainings: [{ id: "w1", teamId: "t1", athletes: { a1: { present: true } } }, { id: "w2", teamId: "t2" }] };

test("URLs representam perfis, equipes e registros sem estado temporário", () => {
  for (const role of ["coach", "athlete"]) {
    for (const view of ["lobby", "home"]) {
      const path = routePath(`${role}-${view}`, "t1");
      const route = parseRoute(`#${path}`);
      assert.equal(route.view, `${role}-${view}`);
      assert.equal(route.teamId, view === "home" ? "t1" : undefined);
    }
  }
  for (const [section, field, id] of [["athletes", "athleteId", "a1"], ["trainings", "trainingId", "w1"]]) {
    const route = parseRoute(`#${routePath(`coach-${section}`, "t1", id)}`);
    assert.equal(route[field], id);
    assert.equal(routeError(route, state, coach), "");
  }
  assert.equal(parseRoute("#/coach/teams/t1/trainings/new").createTraining, true);
  assert.equal(routePath("coach-trainings"), "/coach/teams");
});

test("URLs inválidas, equipes alheias e registros de outra equipe são rejeitados", () => {
  for (const path of ["#/missing", "#/coach/profile/t1", "#/coach/teams/t1/requests/a1",
    "#/athlete/teams/t1/settings", "#/coach/search", "#/coach/teams/t1/trainings/%zz"]) {
    assert.equal(parseRoute(path).view, "not-found", path);
  }
  for (const path of ["#/coach/teams/t2", "#/coach/teams/missing", "#/coach/teams/t1/athletes/missing",
    "#/coach/teams/t1/trainings/w2", "#/athlete/teams"]) {
    assert.ok(routeError(parseRoute(path), state, coach), path);
  }
  assert.ok(routeError(parseRoute("#/athlete/teams/t2"), state, athlete));
  assert.equal(routeError(parseRoute("#/athlete/teams/t1"), state, athlete), "");
  assert.equal(routeError(parseRoute("#/athlete/teams/t1/trainings/w1"), state, athlete), "");
  assert.ok(routeError(parseRoute("#/athlete/teams/t1/trainings/w2"), state, athlete));
  assert.ok(routeError(parseRoute("#/athlete/teams/t1/trainings/w1"), {
    ...state, trainings: [{ id: "w1", teamId: "t1", athletes: {} }]
  }, athlete));
});

test("Meu Perfil tem uma única rota, sem equipe ou perfil de usuário na URL", () => {
  const route = parseRoute("#/perfil");
  assert.deepEqual(route, { view: "profile" });
  assert.equal(routePath("profile", "t1", "another-user"), "/perfil");
  for (const session of [coach, athlete]) {
    assert.equal(routeError(route, { teams: [], memberships: [], trainings: [] }, session), "");
    const oldRoute = parseRoute(`#/${session.role}/profile`);
    assert.equal(oldRoute.redirect, "/perfil");
    assert.equal(oldRoute.teamId, undefined);
  }
  for (const url of ["#/perfil/t1", "#/coach/teams/t1/profile", "#/athlete/teams/t1/profile"]) {
    assert.equal(parseRoute(url).view, "not-found");
  }
});

test("registro removido nunca seleciona silenciosamente outra equipe ou outro registro", () => {
  const route = parseRoute("#/coach/teams/t1/trainings/w1");
  assert.ok(routeError(route, { ...state, trainings: [state.trainings[1]] }, coach));
  assert.ok(routeError(route, { ...state, teams: [state.teams[1]] }, coach));
  assert.ok(routeError(parseRoute("#/athlete/teams/t1"), { ...state, memberships: [] }, athlete));
});
