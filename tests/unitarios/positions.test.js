import assert from "node:assert/strict";
import test from "node:test";
import { getPositionOptions, positionError } from "../../shared/positions.js";
import { membershipPatch } from "../../shared/contracts.js";

test("Futsal normaliza modalidade e permite somente as quatro posições", () => {
  for (const modality of ["Futsal", " FUTSAL ", "fúTsÁl", "Fu\u0301tsal"]) {
    assert.deepEqual(getPositionOptions(modality), ["Goleiro", "Fixo", "Pivô", "Ala"]);
    for (const position of getPositionOptions(modality)) {
      assert.equal(positionError(modality, position), null);
      assert.deepEqual(membershipPatch({ position }, modality), { position });
    }
    for (const position of ["Ponteiro", "Pivo", "", null, "ala", 12]) {
      assert.throws(() => membershipPatch({ position }, modality), /[Pp]osição/);
    }
  }
});

test("outras modalidades mantêm texto livre e PATCH parcial preserva posição antiga", () => {
  for (const modality of ["Vôlei", "Futebol", "Basquete", "Outra", undefined]) {
    assert.equal(getPositionOptions(modality), null);
    assert.deepEqual(membershipPatch({ position: " Ponteiro " }, modality), { position: "Ponteiro" });
    assert.deepEqual(membershipPatch({ position: "" }, modality), { position: null });
  }
  const stored = { number: 10, position: "Ponteiro" };
  const updated = { ...stored, ...membershipPatch({ number: 7 }, "Futsal") };
  assert.equal(updated.position, "Ponteiro");
  assert.equal(stored.position, "Ponteiro");
});
