import { Activity, ArrowRight, CalendarCheck, ChartNoAxesColumnIncreasing, ClipboardList, Target, TrendingUp } from "lucide-react";
import { evaluationRole, recordScore } from "../../../shared/evaluations.js";
import { goalProgress } from "../../../shared/personalGoals.js";
import { getApprovedAthletes, getAthleteTrainings } from "../../app/state/selectors.js";
import { useTodayDate } from "../../hooks/useTodayDate.js";
import { Button } from "../../components/ui/Button.jsx";
import { CardGrid } from "../../components/ui/CardGrid.jsx";
import { KpiCard } from "../../components/ui/KpiCard.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { GoalkeeperSummary } from "../evaluations/PositionEvaluation.jsx";
import { formatDate } from "../../utils/formatters.js";
import { EvolutionChart } from "./components/EvolutionChart.jsx";
import { individualEvolution } from "./model/individualEvolution.js";
import { mean, numberLabel, personalPanel, signed } from "./model/personalPanel.js";
import { scoreLabel } from "./model/athletePerformance.js";
import { GoalResult, PersonalGoals } from "./PersonalGoals.jsx";
import { PersonalHistory } from "./PersonalHistory.jsx";
import { Highlights, PersonalPerformance } from "./PersonalPerformance.jsx";
import "./AthleteExperience.css";

export function AthleteDashboard({ athleteId, state, team, onOpenTraining, view = "athlete-home", navigate, actions }) {
  const today = useTodayDate();
  if (!team) return <EmptyState title="Nenhuma equipe selecionada" text="Selecione uma equipe aprovada para acompanhar seus dados." />;
  const trainings = getAthleteTrainings(state, team.id, athleteId);
  const athlete = getApprovedAthletes(state, team.id).find(item => item.id === athleteId);
  if (!athlete) return <EmptyState title="Vínculo indisponível" text="Consulte suas equipes aprovadas." />;
  const panel = personalPanel(team, athlete, trainings, today);
  const props = { team, athlete, trainings, panel, today, onOpen: onOpenTraining };
  const role = evaluationRole(team.modality, athlete.position);
  const membership = state.memberships.find(m => m.teamId === team.id && m.athleteId === athleteId);
  const goals = (state.goals || []).filter(g => g.membershipId === membership.id);
  function rowsFor(goal) {
    if (goal.profile === (role || "TEAM")) return panel.rows;
    const position = { GOALKEEPER: "Goleiro", OUTFIELD: "Ala" }[goal.profile];
    return individualEvolution({ team, athlete: { ...athlete, position }, trainings, period: "all", today }).rows;
  }
  if (view === "athlete-goals") return <PersonalGoals {...props} criteria={panel.criteria} goals={goals} rowsFor={rowsFor} save={(id, body) => actions.saveGoal(team.id, id, body)} />;
  if (view === "athlete-performance") return <PersonalPerformance {...props} />;
  if (view === "athlete-trainings") return <PersonalHistory {...props} />;
  const scores = panel.evaluated.map(t => recordScore(t.athletes[athleteId]));
  const latest = panel.evaluated[0];
  const previous = panel.evaluated.find(t => t.date < latest.date);
  const change = previous ? scores[0] - recordScore(previous.athletes[athleteId]) : null;
  const ongoing = goals.filter(g => !g.archived && (!g.deadline || g.deadline >= today) && goalProgress(g, rowsFor(g), today).status !== "Atingida").slice(0,3);
  const criteria = Object.entries(latest?.athletes[athleteId]?.ratings || {}).filter(([, score]) => Number.isFinite(score));
  return <div className="page-stack athlete-experience">
    <header className="section-heading athlete-profile-header"><div><h2>Olá, {athlete.name}</h2><p>{team.name}{athlete.position && ` · ${athlete.position}`}{role && ` · Perfil de ${role === "GOALKEEPER" ? "goleiro" : "linha"}`}</p></div></header>
    <CardGrid columns={4} className="kpi-grid athlete-kpis" label="Resumo pessoal">
      <KpiCard icon={Activity} label="Média geral" value={scoreLabel(mean(scores))} detail="Avaliações desta equipe" />
      <KpiCard icon={CalendarCheck} label="Presença" value={panel.attendance === null ? "—" : numberLabel(panel.attendance) + "%"} detail={`${panel.present} de ${panel.present + panel.absent} treinos com registro`} />
      <KpiCard icon={TrendingUp} label="Evolução recente" value={signed(change)} detail="Entre as últimas datas" />
      <KpiCard icon={ClipboardList} label="Avaliações válidas" value={scores.length} detail="Treinos com nota geral" />
    </CardGrid>
    <EvolutionChart dashboard icon={ChartNoAxesColumnIncreasing} title="Evolução da média geral"
      yAxis={{ domain: [0, 10], ticks: [0, 2.5, 5, 7.5, 10], tickFormatter: numberLabel }}
      data={panel.rows.map(row => ({ ...row, averageScore: row.scores.get("average") }))}
      footer={<Button type="button" variant="ghost" icon={ArrowRight} onClick={() => navigate("athlete-performance")}>Ver desempenho completo</Button>} />
    <CardGrid label="Acompanhamento pessoal">
      <section className="panel page-stack"><h2>Última avaliação</h2>{latest ? <>
        <div className="page-stack"><div><p>{formatDate(latest.date)} · {latest.type}</p><strong className="athlete-performance__value">{scoreLabel(scores[0])}</strong></div>
          <div><p>Critérios avaliados</p>{criteria.length ? <p>{criteria.map(([name]) => name).join(" · ")}</p> : <p>Sem critérios registrados.</p>}</div></div>
        <Button variant="ghost" icon={ArrowRight} onClick={() => onOpenTraining(latest.id)}>Ver detalhes</Button></> : <p>Nenhuma avaliação registrada.</p>}</section>
      <Highlights highlights={panel.highlights} />
      <section className="panel page-stack"><h2>Metas em andamento</h2>
        <div className={ongoing.length ? "page-stack" : "empty-state"}>
          {ongoing.length ? ongoing.map(g => <GoalResult key={g.id} goal={g} rows={rowsFor(g)} today={today} />) : <p>Nenhuma meta em andamento.</p>}
          <Button variant="ghost" icon={Target} onClick={() => navigate("athlete-goals")}>Consultar metas</Button>
        </div></section>
    </CardGrid>
    {role === "GOALKEEPER" && <GoalkeeperSummary records={trainings.map(t => t.athletes[athleteId])} />}
  </div>;
}
