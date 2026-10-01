import assert from "node:assert/strict";
import test from "node:test";
import { evaluationFromRatings, getTeamCriteria } from "../shared/criteria.js";
import { toClientTraining } from "../server/src/lib/serializadores.js";

test("notas zero, dez, ausência, aliases e PATCH parcial preservam o contrato", () => {
  assert.equal(evaluationFromRatings({ Tecnica: 0 }).technique, 0);
  assert.equal(evaluationFromRatings({ Participacao: 10 }).participation, 10);
  assert.equal(evaluationFromRatings({}).technique, 5);
  assert.deepEqual(evaluationFromRatings({ Tecnica: 0 }, {}, false), { technique: 0 });
  for (const value of [null, "", "0", -1, 11, 2.5]) assert.throws(() => evaluationFromRatings({ Técnica: value }));
  assert.throws(() => evaluationFromRatings({ Técnica: 0, Tecnica: 1 }));
  assert.throws(() => evaluationFromRatings({ Desconhecido: 1 }));
  const team = { qualitativeCriteria: ["Habilidade", "Condicionamento fisico", "Participacao", "Trabalho em equipe", "Extra legado"] };
  assert.equal(getTeamCriteria(team, "qualitative")[1], "Condicionamento físico");
  const result = toClientTraining({ records: [{ athleteId: "a", evaluation: { technique: 0, participation: 10 } }] }, team);
  assert.equal(result.athletes.a.ratings.Habilidade, 0);
  assert.equal(result.athletes.a.ratings.Participação, 10);
  assert.equal(result.athletes.a.ratings["Extra legado"], undefined);
});
