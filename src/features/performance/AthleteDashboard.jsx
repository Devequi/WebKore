import { CardGrid } from "../../components/ui/CardGrid.jsx";
import { GoalkeeperSummary } from "../evaluations/PositionEvaluation.jsx";
import { evaluationRole } from "../../../shared/evaluations.js";
import { getApprovedAthletes } from "../../app/state/selectors.js";
import { Activity, CalendarDays, Trophy } from "lucide-react";
import { EvolutionChart } from "./components/EvolutionChart.jsx";
import { TrainingHistory } from "../training/TrainingHistory.jsx";
import { PerformanceSummary } from "./components/PerformanceSummary.jsx";
import { KpiCard } from "../../components/ui/KpiCard.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { percent } from "../../utils/formatters.js";
import { athletePerformance, scoreLabel } from "./model/athletePerformance.js";
import { getAthleteTrainings } from "../../app/state/selectors.js";
import { getTeamCriteria } from "../../../shared/criteria.js";
import "./AthleteExperience.css";

export function AthleteDashboard({ athleteId, state, team, onOpenTraining }) {
  if (!team) return <EmptyState title="Nenhuma equipe selecionada" text="Acesse Equipes e selecione uma equipe aprovada para acompanhar seus dados." />;
  const trainings = getAthleteTrainings(state, team.id, athleteId);
  const performance = athletePerformance(trainings, athleteId);
  const athlete = getApprovedAthletes(state, team.id).find((item) => item.id === athleteId);
  const goalkeeper = evaluationRole(team.modality, athlete?.position) === "GOALKEEPER";
  return <div className="page-stack athlete-experience">
    <CardGrid className="kpi-grid athlete-kpis" label="Resumo da equipe atual">
      <KpiCard icon={Activity} label="Presença" value={performance.presenceAverage === null ? "—" : percent(performance.presenceAverage)} detail="Frequência nos treinos registrados" />
      <KpiCard icon={CalendarDays} label="Treinos" value={trainings.length} detail="Registros individuais nesta equipe" />
      <KpiCard icon={Trophy} label="Média geral" value={scoreLabel(performance.averageScore)} detail={`${performance.evaluationCount} avaliações · escala de 0 a 10`} />
    </CardGrid>
    {goalkeeper && <GoalkeeperSummary records={trainings.map((training) => training.athletes[athleteId])} />}
    <div className="athlete-dashboard-grid"><div className="page-stack">
      <EvolutionChart key={team.id} data={performance.observations} criteria={performance.criteria.length ? performance.criteria : getTeamCriteria(team, "qualitative")} />
      <PerformanceSummary performance={performance} />
    </div><TrainingHistory key={team.id} trainings={trainings} athleteId={athleteId} onOpenTraining={onOpenTraining} /></div>
  </div>;
}
