import { EvolutionChart } from "./GraficoEvolucao.jsx";

export function TeamEvolutionChart({ performance, criteria }) {
  return <EvolutionChart data={performance.observations} criteria={criteria} title="Evolução média da equipe" />;
}
