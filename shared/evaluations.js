import { normalizeModality, criterionKey } from "./criteria.js";

export const PROFILE_VERSION = 2;
export const evaluationProfiles = [["OUTFIELD", "Jogadores de Linha"], ["GOALKEEPER", "Goleiros"]];
export const criterionKinds = [["QUALITATIVE", "Avaliações qualitativas"], ["QUANTITATIVE", "Medidas quantitativas"]];
export const DEFAULT_PROFILES = {
  OUTFIELD: { QUALITATIVE: ["Posicionamento", "Tomada de decisão", "Trabalho em equipe", "Disciplina tática"],
    QUANTITATIVE: ["Gols", "Assistências", "Finalizações", "Passes certos"] },
  GOALKEEPER: { QUALITATIVE: ["Posicionamento", "Reflexos", "Comunicação", "Tomada de decisão"],
    QUANTITATIVE: ["Defesas", "Saídas do gol", "Reposições certas", "Gols sofridos"] }
};
export function criteriaFor(team, role, kind) {
  if (normalizeModality(team?.modality) !== "Futsal" || !DEFAULT_PROFILES[role]) return null;
  const stored = team.evaluationProfiles?.find((profile) => profile.schemaVersion === PROFILE_VERSION && profile.modality === "Futsal" && profile.role === role);
  return stored ? stored.criteria.filter((item) => item.kind === kind && !item.archived).slice().sort((a,b) => a.order - b.order)
    : DEFAULT_PROFILES[role][kind].map((name, order) => ({ id: `default:${team.id || "new"}:${role}:${kind}:${order}`, name, kind, order, weight: kind === "QUALITATIVE" ? 25 : 0 }));
}
export function validateTypedCriteria(criteria) {
  if (!Array.isArray(criteria) || criteria.length > 8) throw new Error("Cada perfil permite até 4 critérios qualitativos e 4 quantitativos.");
  const ids = new Set(), names = new Set(), counts = { QUALITATIVE: 0, QUANTITATIVE: 0 };
  return criteria.map((item, order) => {
    if (!item || !Object.hasOwn(counts, item.kind)) throw new Error("Tipo de critério inválido.");
    if (++counts[item.kind] > 4) throw new Error("O limite é de 4 critérios por tipo e perfil.");
    if (typeof item.id !== "string" || !/^[a-zA-Z0-9:_-]+$/.test(item.id) || item.id.length > 191 || ids.has(item.id.toLowerCase())) throw new Error("Identificador de critério inválido ou repetido.");
    ids.add(item.id.toLowerCase());
    if (typeof item.name !== "string" || !item.name.trim() || item.name.length > 191) throw new Error("Informe um nome de critério com até 191 caracteres.");
    const key = `${item.kind}:${criterionKey(item.name)}`;
    if (names.has(key)) throw new Error("Critério repetido no mesmo tipo.");
    names.add(key);
    return { id: item.id, name: item.name.trim(), kind: item.kind, order: counts[item.kind] - 1, weight: item.kind === "QUALITATIVE" ? 100 / criteria.filter((criterion) => criterion.kind === "QUALITATIVE").length : 0 };
  });
}
export function validateMeasurements(criteria, values) {
  if (!values || typeof values !== "object" || Array.isArray(values)) throw new Error("Medidas inválidas.");
  const ids = new Set(criteria.map((item) => item.criterionId || item.id));
  if (Object.keys(values).some((key) => !ids.has(key))) throw new Error("Medida não pertence ao perfil registrado para este atleta.");
  for (const value of Object.values(values)) {
    if (value !== null && (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 2147483647)) throw new Error("Medidas devem ser contagens inteiras não negativas ou não informadas.");
  }
  return criteria.map((item, order) => ({ criterionId: item.criterionId || item.id, name: item.name, order: item.order ?? order,
    value: Object.hasOwn(values, item.criterionId || item.id) ? values[item.criterionId || item.id] : (item.value ?? null) }));
}
export const MIN_RANKING_EVALUATIONS = 3;
export const goalkeeperFields = {
  saves: "Defesas realizadas", goalsConceded: "Gols sofridos", shotsOnTarget: "Finalizações no alvo sofridas",
  difficultSaves: "Defesas difíceis", accurateDistributions: "Reposições corretas", distributionAttempts: "Reposições tentadas",
  successfulExits: "Saídas bem-sucedidas", exitAttempts: "Saídas tentadas"
};
export function evaluationRole(modality, position) {
  if (normalizeModality(modality) !== "Futsal") return null;
  if (position === "Goleiro") return "GOALKEEPER";
  return ["Fixo", "Ala", "Pivô"].includes(position) ? "OUTFIELD" : null;
}
export function validateProfile(criteria, historical = false) {
  if (!Array.isArray(criteria) || !criteria.length || criteria.length > 20) throw new Error("Informe de 1 a 20 critérios.");
  const names = new Set();
  for (const item of criteria) {
    if (!item || typeof item.name !== "string" || !item.name.trim() || item.name.length > 191) throw new Error("Nome de critério inválido.");
    const key = criterionKey(item.name);
    if (names.has(key)) throw new Error("Critério repetido.");
    names.add(key);
    if (historical && (typeof item.weight !== "number" || !Number.isFinite(item.weight) || item.weight <= 0 || item.weight > 100)) throw new Error("Peso deve ser maior que zero e até 100%.");
  }
  if (historical && Math.abs(criteria.reduce((sum, item) => sum + item.weight, 0) - 100) > 0.000001) throw new Error("Os pesos devem somar 100%.");
  return criteria.map(({ name, weight, id, criterionId }, order) => ({ name: name.trim(), weight: historical ? weight : 100 / criteria.length, order, criterionId: criterionId || id || null }));
}
export function profileFor(team, role) { return criteriaFor(team, role, "QUALITATIVE"); }
function scoreCriteria(profile, ratings) {
  if (!ratings || typeof ratings !== "object" || Array.isArray(ratings) || Object.keys(ratings).length !== profile.length ||
      Object.keys(ratings).some((name) => !profile.some((item) => item.name === name))) throw new Error("Preencha todos os critérios da avaliação.");
  return profile.map((item) => {
    const score = ratings[item.name];
    if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 10) throw new Error("Nota deve estar entre 0 e 10.");
    return { ...item, score };
  });
}
// Historical records retain their original scoring rule.
export function weightedEvaluation(criteria, ratings) {
  const snapshot = scoreCriteria(validateProfile(criteria, true), ratings);
  const finalScore = snapshot.reduce((sum, item) => sum + item.score * item.weight, 0) / 100;
  return { criteria: snapshot, finalScore: Math.round(finalScore * 1e6) / 1e6 };
}
export function arithmeticEvaluation(criteria, ratings) {
  const snapshot = scoreCriteria(validateProfile(criteria), ratings);
  const finalScore = snapshot.reduce((sum, item) => sum + item.score, 0) / snapshot.length;
  return { criteria: snapshot, finalScore: Math.round(finalScore * 1e6) / 1e6 };
}
export function initialRatings(criteria, saved = {}) {
  return Object.fromEntries((criteria || []).map(({ name }) => [name, Object.hasOwn(saved, name) ? saved[name] : 5]));
}
export function validateGoalkeeperStats(stats) {
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) throw new Error("Estatísticas inválidas.");
  for (const [key, value] of Object.entries(stats)) {
    if (!Object.hasOwn(goalkeeperFields, key)) throw new Error("Estatística desconhecida.");
    if (value !== null && (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 2147483647)) throw new Error("Estatísticas devem ser inteiros não negativos ou não informadas.");
  }
  const pairs = [["difficultSaves", "saves"], ["accurateDistributions", "distributionAttempts"], ["successfulExits", "exitAttempts"]];
  for (const [success, attempts] of pairs) {
    if (stats[success] != null && stats[attempts] != null && stats[success] > stats[attempts]) throw new Error("Ações bem-sucedidas não podem ultrapassar o total de tentativas.");
  }
  // A shot on target ends in a save or a goal (no blocked/off-target shots).
  if ([stats.saves, stats.goalsConceded, stats.shotsOnTarget].every((n) => n != null) && stats.shotsOnTarget !== stats.saves + stats.goalsConceded) throw new Error("Finalizações no alvo devem ser iguais a defesas + gols sofridos.");
  if (stats.shotsOnTarget != null && [stats.saves, stats.goalsConceded].some((n) => n != null && n > stats.shotsOnTarget)) throw new Error("Defesas e gols não podem ultrapassar as finalizações no alvo.");
  return Object.fromEntries(Object.keys(goalkeeperFields).map((key) => [key, stats[key] ?? null]));
}
export const ratio = (success, attempts) => Number.isFinite(success) && Number.isFinite(attempts) && attempts > 0 ? success / attempts * 100 : null;
export function goalkeeperIndicators(stats = {}) {
  return { defensiveEfficiency: ratio(stats.saves, stats.saves != null && stats.goalsConceded != null ? stats.saves + stats.goalsConceded : null),
    distributionAccuracy: ratio(stats.accurateDistributions, stats.distributionAttempts), exitEfficiency: ratio(stats.successfulExits, stats.exitAttempts) };
}
export function aggregateGoalkeeperStats(records) {
  const stats = records.filter((record) => record?.role === "GOALKEEPER").map((record) => record.goalkeeperStats).filter(Boolean);
  const sum = (key) => { const values = stats.map((item) => item[key]).filter(Number.isFinite); return values.length ? values.reduce((a, b) => a + b, 0) : null; };
  // Ratios use only records with both numerator and denominator observed.
  const paired = (a, b) => stats.filter((item) => Number.isFinite(item[a]) && Number.isFinite(item[b]));
  const combined = (a, b, defensive = false) => {
    const values = paired(a, b);
    if (!values.length) return null;
    const first = values.reduce((total, item) => total + item[a], 0);
    const second = values.reduce((total, item) => total + item[b], 0);
    return ratio(first, defensive ? first + second : second);
  };
  return { ...Object.fromEntries(Object.keys(goalkeeperFields).map((key) => [key, sum(key)])),
    defensiveEfficiency: combined("saves", "goalsConceded", true),
    distributionAccuracy: combined("accurateDistributions", "distributionAttempts"), exitEfficiency: combined("successfulExits", "exitAttempts") };
}
export function recordScore(record) {
  if (["WEIGHTED", "AVERAGE"].includes(record?.evaluationSource)) return Number.isFinite(record.finalScore) && record.finalScore >= 0 && record.finalScore <= 10 ? record.finalScore : null;
  const values = Object.values(record?.ratings || {}).filter((n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 10);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}
export function positionRankings(athletes, trainings, minimum = MIN_RANKING_EVALUATIONS) {
  return Object.fromEntries(["OUTFIELD", "GOALKEEPER"].map((role) => [role, athletes.map((athlete) => {
    const records = trainings.map((training) => training.athletes?.[athlete.id]).filter((record) => record?.role === role && ["WEIGHTED", "AVERAGE"].includes(record.evaluationSource) && recordScore(record) !== null);
    return { ...athlete, score: records.length ? records.reduce((sum, record) => sum + recordScore(record), 0) / records.length : null, evaluationCount: records.length };
  }).filter((athlete) => athlete.evaluationCount >= minimum).sort((a, b) => b.score - a.score || b.evaluationCount - a.evaluationCount || a.id.localeCompare(b.id))]));
}
