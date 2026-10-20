import { Activity, CalendarDays, Trophy } from "lucide-react";
import { EvolutionChart } from "../../componentes/charts/GraficoEvolucao.jsx";
import { TrainingHistory } from "../../componentes/charts/HistoricoTreinos.jsx";
import { PerformanceSummary } from "../../componentes/ui/ResumoDesempenho.jsx";
import { KpiCard } from "../../componentes/ui/CartaoKpi.jsx";
import { EmptyState } from "../../componentes/ui/EstadoVazio.jsx";
import { percent } from "../../utils/formatters.js";
import { athletePerformance, scoreLabel } from "../../utils/athletePerformance.js";
import { getAthleteTrainings } from "../../utils/selectors.js";
import { getTeamCriteria } from "../../../shared/criteria.js";
import "../../styles/paginasAtleta/AthleteExperience.css";

export function AthleteDashboard({ athleteId, state, team }) {
  if (!team) return <EmptyState title="Nenhuma equipe selecionada" text="Acesse Equipes e selecione uma equipe aprovada para acompanhar seus dados." />;
  const trainings = getAthleteTrainings(state, team.id, athleteId);
  const performance = athletePerformance(trainings, athleteId);
  return <div className="page-stack athlete-experience">
    <section className="kpi-grid athlete-kpis" aria-label="Resumo da equipe atual">
      <KpiCard icon={Activity} label="Presença" value={performance.presenceAverage === null ? "—" : percent(performance.presenceAverage)} detail="Frequência nos treinos registrados" />
      <KpiCard icon={CalendarDays} label="Treinos" value={trainings.length} detail="Registros individuais nesta equipe" />
      <KpiCard icon={Trophy} label="Média geral" value={scoreLabel(performance.averageScore)} detail={`${performance.evaluationCount} avaliações · escala de 0 a 10`} />
    </section>
    <div className="athlete-dashboard-grid"><div className="page-stack">
      <EvolutionChart key={team.id} data={performance.observations} criteria={getTeamCriteria(team, "qualitative")} />
      <PerformanceSummary performance={performance} />
    </div><TrainingHistory key={team.id} trainings={trainings} athleteId={athleteId} /></div>
  </div>;
}
