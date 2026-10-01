import assert from "node:assert/strict";
import test from "node:test";
import { joinedStatus, membershipPatch, normalizeTeamCode } from "../shared/contracts.js";
import { normalizeModality } from "../shared/criteria.js";
import { getApprovedAthletes } from "../src/utils/selectors.js";

test("contratos compartilhados preservam campos omitidos, zero, vínculo e modalidades", () => {
  assert.deepEqual(membershipPatch({ number: "0" }), { number: 0 });
  assert.deepEqual(membershipPatch({ position: " Ala " }), { position: "Ala" });
  assert.deepEqual(membershipPatch({ number: null, position: "" }), { number: null, position: null });
  assert.deepEqual(membershipPatch({}), {});
  assert.equal(joinedStatus("approved"), "approved");
  assert.equal(joinedStatus("pending"), "pending");
  assert.equal(joinedStatus("rejected"), "pending");
  assert.equal(normalizeTeamCode(" wk-team-123 "), "WK-TEAM-123");
  for (const value of ["Volei", "Vôlei", " vôlei ", "VOLEI"]) assert.equal(normalizeModality(value), "Vôlei");
  const state = { users: [{ id: "athlete", number: 10, position: "Ala" }], memberships: [
    { athleteId: "athlete", teamId: "first", status: "approved", number: 0, position: null },
    { athleteId: "athlete", teamId: "second", status: "approved", number: 7, position: "Pivô" }
  ] };
  assert.equal(getApprovedAthletes(state, "first")[0].number, 0);
  assert.equal(getApprovedAthletes(state, "first")[0].position, null);
  assert.equal(getApprovedAthletes(state, "second")[0].number, 7);
});
