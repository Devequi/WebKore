import { EvolutionChart } from "./GraficoEvolucao.jsx";

export function AthleteDashboard({ performance, criteria }) {
  return <EvolutionChart data={performance.observations} criteria={criteria} title="Evolução individual do atleta" />;
}
