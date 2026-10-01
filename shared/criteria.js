export const metricCatalog = {
  Futsal: ["Gols", "Assistências", "Finalizações", "Desarmes"],
  Vôlei: ["Pontos", "Aces", "Bloqueios", "Defesas"],
  Basquete: ["Pontos", "Assistências", "Rebotes", "Roubos"],
  Handebol: ["Gols", "Assistências", "Defesas", "Interceptações"],
  Futebol: ["Gols", "Assistências", "Passes-chave", "Desarmes"]
};

export const defaultQualitativeCriteria = ["Técnica", "Condicionamento físico", "Participação", "Trabalho em equipe"];
export const qualitativeFields = ["technique", "physicalCondition", "participation", "teamwork"];

export function criterionKey(value) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function canonicalCriterion(value) {
  return defaultQualitativeCriteria.find((name) => criterionKey(name) === criterionKey(value)) || value;
}

export function evaluationFromRatings(ratings = {}, team, defaults = true) {
  if (!ratings || typeof ratings !== "object" || Array.isArray(ratings)) throw new Error("Avaliações inválidas.");
  const criteria = getTeamCriteria(team, "qualitative").slice(0, 4);
  const names = new Map(criteria.map((name, index) => [criterionKey(name), qualitativeFields[index]]));
  criteria.forEach((_, index) => {
    const alias = criterionKey(defaultQualitativeCriteria[index]);
    if (!names.has(alias)) names.set(alias, qualitativeFields[index]);
  });
  const values = defaults ? Object.fromEntries(qualitativeFields.map((field) => [field, 5])) : {};
  const supplied = new Set();
  for (const [name, value] of Object.entries(ratings)) {
    const field = names.get(criterionKey(name));
    if (!field) throw new Error("Critério de avaliação não encontrado.");
    if (supplied.has(field)) throw new Error("Critério de avaliação repetido.");
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 10) throw new Error("Nota deve ser um inteiro entre 0 e 10.");
    supplied.add(field);
    values[field] = value;
  }
  return values;
}

export function normalizeModality(value) {
  if (typeof value !== "string") return null;
  const normalize = (item) => item.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return Object.keys(metricCatalog).find((item) => normalize(item) === normalize(value)) || null;
}

export function getTeamCriteria(team, kind) {
  if (kind === "qualitative") return (team?.qualitativeCriteria ?? defaultQualitativeCriteria).map(canonicalCriterion);
  if (kind === "objective") return team.objectiveCriteria ?? metricCatalog[normalizeModality(team.modality)] ?? metricCatalog.Futsal;
  throw new Error("Tipo de critério inválido.");
}

export function criteriaError(criteria, kind) {
  if (!Array.isArray(criteria) || criteria.some((name) => typeof name !== "string" || !name.trim() || name.length > 191)) return "Informe uma lista de critérios com nomes não vazios e até 191 caracteres.";
  if (kind === "qualitative" && criteria.length > 4) return "São permitidos no máximo quatro critérios qualitativos.";
  if (new Set(criteria.map(criterionKey)).size !== criteria.length) return "Os nomes dos critérios não podem se repetir.";
  return null;
}

export function changeCriterion(team, { kind, name, previousName, nextName }, operation, hasTrainings = false) {
  const current = getTeamCriteria(team, kind);
  const value = (operation === "rename" ? nextName : name)?.trim();
  if (!value) throw new Error("Informe o nome do critério.");
  const index = current.indexOf(operation === "rename" ? previousName : value);
  if (operation !== "add" && index < 0) throw new Error("Critério não encontrado.");
  if (operation === "remove" && kind === "qualitative" && hasTrainings && index < 4) {
    throw new Error("Um critério qualitativo usado em treinos não pode ser removido. Renomeie-o para preservar as notas.");
  }
  const next = operation === "add" ? [...current, value]
    : operation === "remove" ? current.filter((_, position) => position !== index)
    : current.map((item, position) => position === index ? value : item);
  const error = criteriaError(next, kind);
  if (error) throw new Error(error);
  return { [`${kind}Criteria`]: next };
}
