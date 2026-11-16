import { goalkeeperIndicators, goalkeeperFields, recordScore } from "../../shared/evaluations.js";
import { formatDate } from "../utils/formatters.js";
import { getTeamTrainings } from "../utils/selectors.js";

export function csvCell(value) {
  const text = String(value ?? "");
  // Planilhas não devem executar fórmulas inseridas em nomes ou descrições.
  const safe = /^\s*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function teamReportRows(state, team) {
  const trainings = getTeamTrainings(state, team.id);
  const header = ["Equipe", "Modalidade", "Atleta", "Data", "Tipo", "Presença", "Média (0–10)", "Métricas", "Posição registrada", "Origem", "Critérios e notas", "Estatísticas do goleiro", "Indicadores do goleiro", "ID do treino", "ID do atleta"];
  const rows = trainings.flatMap((training) => Object.entries(training.athletes || {}).map(([athleteId, record]) => {
    const athlete = state.users.find((user) => user.id === athleteId);
    const stats = record.goalkeeperStats;
    const indicators = stats ? goalkeeperIndicators(stats) : null;
    return [team.name, record.modality || team.modality, athlete?.name || athleteId, formatDate(training.date), training.type,
      record.present ? "Presente" : "Ausente", recordScore(record),
      [...Object.entries(record.metrics || {}).map(([name, value]) => `${name}: ${value}`), ...(record.measurements || []).map((item) => `${item.name}: ${item.value ?? "Não informado"}`)].join(" | "),
      record.position || "Não registrada (legado)", record.evaluationSource || "Sem avaliação",
      record.evaluationSource === "WEIGHTED" ? (record.criteriaSnapshot || []).map((item) => `${item.name}: ${item.score} (peso ${item.weight}%)`).join(" | ")
        : Object.entries(record.ratings || {}).map(([name, value]) => `${name}: ${value}`).join(" | "),
      stats ? Object.entries(goalkeeperFields).map(([key, label]) => `${label}: ${stats[key] ?? "Sem dados"}`).join(" | ") : "Sem dados",
      indicators ? Object.entries(indicators).map(([key, value]) => `${key}: ${value === null ? "Sem dados" : `${value.toFixed(2)}%`}`).join(" | ") : "Sem dados",
      training.id, athleteId];
  }));
  return [header, ...rows];
}
export function downloadTeamReport(state, team) {
  if (!team) return;
  const [header, ...rows] = teamReportRows(state, team);
  const content = [header, ...rows.filter(Boolean)].map((row) => row.map(csvCell).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `webkore-${team.code}-relatorio.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
