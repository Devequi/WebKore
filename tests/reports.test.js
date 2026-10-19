import assert from "node:assert/strict";
import test from "node:test";
import { csvCell } from "../src/services/reports.js";

test("exportação CSV escapa aspas e impede fórmulas em nomes controlados pelo usuário", () => {
  assert.equal(csvCell('Equipe "A"'), '"Equipe ""A"""');
  assert.equal(csvCell(0), '"0"');
  assert.equal(csvCell(null), '""');
  for (const value of ["=1+1", "+SUM(A1)", "-1+1", "@SUM(A1)", " \t=1+1", "\r=1+1"]) {
    assert.equal(csvCell(value), `"'${value}"`);
  }
});
