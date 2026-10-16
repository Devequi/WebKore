import assert from "node:assert/strict";
import test from "node:test";
import { calculateAge, formatAge, isDateOnly, todayDateOnly, validateBirthDate } from "../shared/birthDate.js";
import { birthDate as databaseBirthDate } from "../server/src/lib/validacao.js";
import { toPublicUser, toClientTeam } from "../server/src/lib/serializadores.js";
import { publicUserSelect } from "../server/src/lib/acesso.js";

test("idade considera aniversário, virada do ano e recém-nascidos", () => {
  for (const [birth, today, expected] of [
    ["2008-10-16", "2026-10-15", 17], ["2008-10-16", "2026-10-16", 18],
    ["2008-10-16", "2026-10-17", 18], ["2008-12-31", "2026-12-30", 17],
    ["2008-12-31", "2026-12-31", 18], ["2008-12-31", "2027-01-01", 18],
    ["2008-01-01", "2026-12-31", 18], ["2008-01-01", "2027-01-01", 19],
    ["2026-10-16", "2026-10-16", 0]
  ]) assert.equal(calculateAge(birth, today), expected, `${birth} em ${today}`);
  assert.equal(formatAge("2008-10-16", "2026-10-15"), "17 anos");
  assert.equal(formatAge("2025-10-16", "2026-10-16"), "1 ano");
});

test("29/02 completa aniversário em 01/03 em anos comuns e 29/02 em bissextos", () => {
  for (const [today, expected] of [["2023-02-28", 18], ["2023-03-01", 19],
    ["2024-02-28", 19], ["2024-02-29", 20], ["2024-03-01", 20]]) {
    assert.equal(calculateAge("2004-02-29", today), expected);
  }
  assert.equal(isDateOnly("2000-02-29"), true);
  assert.equal(isDateOnly("1900-02-29"), false);
});

test("validação rejeita datas inexistentes, futuras, timestamps e formatos ambíguos", () => {
  for (const value of [undefined, null, "", 20081016, {}, "16/10/2008", "2008-2-01", "0000-01-01",
    "2026-02-29", "2024-02-30", "2026-04-31", "2026-13-01", "2008-10-16T00:00:00Z"]) {
    assert.throws(() => validateBirthDate(value, "2026-10-16"), /válida/);
    assert.equal(calculateAge(value, "2026-10-16"), null);
  }
  assert.throws(() => validateBirthDate("2026-10-17", "2026-10-16"), /futura/);
  assert.equal(validateBirthDate("2026-10-16", "2026-10-16"), "2026-10-16");
  assert.equal(calculateAge("2026-10-17", "2026-10-16"), null);
  assert.equal(formatAge(null), "Idade não informada");
});

test("data civil usa São Paulo; Prisma recebe UTC e o JSON mantém o mesmo dia", () => {
  assert.equal(todayDateOnly(new Date("2027-01-01T02:59:59Z")), "2026-12-31");
  assert.equal(todayDateOnly(new Date("2027-01-01T03:00:00Z")), "2027-01-01");
  const date = databaseBirthDate("2004-02-29");
  assert.equal(date.toISOString(), "2004-02-29T00:00:00.000Z");
  assert.throws(() => databaseBirthDate("2026-02-30"), (error) => error.status === 400);
  const athlete = { id: "athlete", name: "Atleta", role: "ATHLETE", birthDate: date };
  assert.equal(toPublicUser(athlete).birthDate, "2004-02-29");
  assert.equal(toClientTeam({ memberships: [{ status: "APPROVED", athlete }] }).athletes[0].birthDate, "2004-02-29");
  assert.equal(toPublicUser({ ...athlete, birthDate: undefined }).birthDate, null);
  assert.equal(publicUserSelect.birthDate, true);
  assert.equal(toPublicUser(athlete).age, undefined);
});
