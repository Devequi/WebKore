export function normalizeTeamCode(value) {
  return typeof value === "string" ? value.trim().toUpperCase() : null;
}

export function membershipPatch(patch) {
  const data = {};
  if (patch.number !== undefined) {
    const value = patch.number;
    if (value === null || value === "") data.number = null;
    else {
      const number = typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : value;
      if (typeof number !== "number" || !Number.isInteger(number) || number < 0 || number > 2147483647) throw new Error("Número inválido.");
      data.number = number;
    }
  }
  if (patch.position !== undefined) {
    if (patch.position !== null && (typeof patch.position !== "string" || patch.position.length > 191)) throw new Error("Posição inválida.");
    data.position = patch.position?.trim() || null;
  }
  return data;
}
