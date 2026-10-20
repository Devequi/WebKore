import assert from "node:assert/strict";
import test from "node:test";
import { filterAthletesByName } from "../src/utils/athleteSearch.js";

const athletes = [
  { id: "1", name: "João Pedro" },
  { id: "2", name: "Ana Júlia Souza" },
  { id: "3", name: "Pedro João" },
  { id: "4", name: "María Clara" }
];

test("busca ignora acentos, caixa e espaços nas extremidades e preserva a ordem", () => {
  assert.deepEqual(filterAthletesByName(athletes, " JOAO ").map(a => a.id), ["1", "3"]);
  assert.deepEqual(filterAthletesByName(athletes, "júLIA").map(a => a.id), ["2"]);
  assert.deepEqual(filterAthletesByName(athletes, "souza").map(a => a.id), ["2"]);
  assert.deepEqual(filterAthletesByName(athletes, "joao pedro").map(a => a.id), ["1"]);
  assert.deepEqual(filterAthletesByName(athletes, "mar").map(a => a.id), ["4"]);
});

test("busca vazia mantém a lista e nenhuma correspondência não altera os atletas", () => {
  assert.equal(filterAthletesByName(athletes, "  "), athletes);
  assert.deepEqual(filterAthletesByName(athletes, "inexistente"), []);
  assert.deepEqual(athletes.map(a => a.id), ["1", "2", "3", "4"]);
  assert.deepEqual(filterAthletesByName([], "joao"), []);
});
