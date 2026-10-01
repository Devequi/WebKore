import { formatDate } from "../utils/formatters.js";
import { getApprovedAthletes, getRecordAverage, getTeamTrainings } from "../utils/selectors.js";

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function downloadTeamReport(state, team) {
  if (!team) return;

  const athletes = getApprovedAthletes(state, team.id);
  const trainings = getTeamTrainings(state, team.id);
  const header = ["Equipe", "Modalidade", "Atleta", "Data", "Tipo", "Presença", "Média", "Métricas"];
  const rows = trainings.flatMap((training) =>
    athletes.map((athlete) => {
      const record = training.athletes[athlete.id];
      if (!record) return null;
      const metrics = Object.entries(record.metrics || {})
        .map(([name, value]) => `${name}: ${value}`)
        .join(" | ");
      return [
        team.name,
        team.modality,
        athlete.name,
        formatDate(training.date),
        training.type,
        record.present ? "Presente" : "Ausente",
        Math.round(getRecordAverage(record) * 10),
        metrics
      ];
    })
  );

  const content = [header, ...rows.filter(Boolean)].map((row) => row.map(csvCell).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `webkore-${team.code}-relatorio.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
