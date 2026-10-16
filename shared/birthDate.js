// Data civil brasileira: transporte YYYY-MM-DD, sem conversão para o fuso do dispositivo.
export function todayDateOnly(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(now);
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isDateOnly(value) {
  if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateBirthDate(value, today = todayDateOnly()) {
  if (!isDateOnly(value)) throw new Error("Informe uma data de nascimento válida.");
  if (value > today) throw new Error("A data de nascimento não pode ser futura.");
  return value;
}

/** Retorna null para cadastros antigos ou inválidos. Em anos não bissextos,
 * nascidos em 29/02 completam a nova idade em 01/03. */
export function calculateAge(birthDate, today = todayDateOnly()) {
  if (!isDateOnly(birthDate) || !isDateOnly(today) || birthDate > today) return null;
  return Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4)) -
    (today.slice(5) < birthDate.slice(5) ? 1 : 0);
}

export function formatAge(birthDate, today = todayDateOnly()) {
  const age = calculateAge(birthDate, today);
  return age === null ? "Idade não informada" : `${age} ${age === 1 ? "ano" : "anos"}`;
}
