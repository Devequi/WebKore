import { Activity, ArrowRight, CalendarDays, CalendarCheck, ClipboardList, Target, TrendingUp } from "lucide-react";
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
import { PersonalGoals } from "./PersonalGoals.jsx";
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
  const ongoing = goals.filter(g => !g.archived && (!g.deadline || g.deadline >= today))
    .map(goal => ({ goal, result: goalProgress(goal, rowsFor(goal), today) }))
    .filter(({ result }) => result.status !== "Atingida");
  const record = latest?.athletes[athleteId];
  const criteria = (record?.criteriaSnapshot?.length
    ? record.criteriaSnapshot.map(item => [item.name, item.score])
    : Object.entries(record?.ratings || {})).filter(([, score]) => Number.isFinite(score));
  return <div className="page-stack athlete-experience">
    <header className="section-heading athlete-profile-header"><div><h2>Olá, {athlete.name}</h2><p>{team.name}{athlete.position && ` · ${athlete.position}`}{role && ` · Perfil de ${role === "GOALKEEPER" ? "goleiro" : "linha"}`}</p></div></header>
    <CardGrid columns={4} className="kpi-grid athlete-kpis" label="Resumo pessoal">
      <KpiCard icon={Activity} label="Média geral" value={scoreLabel(mean(scores))} detail="Avaliações desta equipe" />
      <KpiCard icon={CalendarCheck} label="Presença" value={panel.attendance === null ? "—" : numberLabel(panel.attendance) + "%"} detail={`${panel.present} de ${panel.present + panel.absent} treinos com registro`} />
      <KpiCard icon={TrendingUp} label="Evolução recente" value={<span className={change > 0 ? "metric-rise" : change < 0 ? "metric-fall" : undefined}>{signed(change)}</span>} detail="Entre as últimas datas" />
      <KpiCard icon={ClipboardList} label="Avaliações válidas" value={scores.length} detail="Treinos com nota geral" />
    </CardGrid>
    <EvolutionChart dashboard title="Evolução da média geral"
      yAxis={{ domain: [0, 10], ticks: [0, 2.5, 5, 7.5, 10], tickFormatter: numberLabel }}
      data={panel.rows.map(row => ({ ...row, averageScore: row.scores.get("average") }))}
      footer={<Button type="button" variant="ghost" icon={ArrowRight} onClick={() => navigate("athlete-performance")}>Ver desempenho completo</Button>} />
    <CardGrid label="Acompanhamento pessoal">
      <section className="panel summary-card">
        <header><h2><ClipboardList />Última avaliação</h2>{latest && <small><CalendarDays />{formatDate(latest.date)}</small>}</header>
        {latest ? <>
          <strong>{latest.type}</strong>
          <div className="score-breakdown">
            <div className="score-ring" style={{ "--score-angle": (scores[0] * 36) + "deg" }}>
              <strong>{numberLabel(scores[0])}<small>/10</small></strong>
            </div>
            <div><p>Critérios avaliados</p>{criteria.length ? <dl className="criterion-scores">{criteria.map(([name, score]) =>
              <div key={name}><dt>{name}</dt><dd>{numberLabel(score)}</dd></div>)}</dl> : <p>Sem critérios registrados.</p>}</div>
          </div>
          <footer><Button variant="ghost" icon={ArrowRight} onClick={() => onOpenTraining(latest.id)}>Ver detalhes</Button></footer>
        </> : <p>Nenhuma avaliação registrada.</p>}
      </section>
      <Highlights highlights={panel.highlights} />
      <section className="panel summary-card">
        <header><h2><Target />Metas em andamento</h2><span className="summary-badge">{ongoing.length} {ongoing.length === 1 ? "ativa" : "ativas"}</span></header>
        {ongoing.length ? ongoing.slice(0, 3).map(({ goal, result }) => {
          const ratio = goal.direction === "atLeast" && goal.target > 0 && Number.isFinite(result.average)
            ? result.average / goal.target : null;
          return <article className="goal-summary" key={goal.id}>
            <div><strong>{goal.label}</strong><span className="summary-badge">{result.status}</span></div>
            <p>Média {numberLabel(result.average)} · Alvo {goal.direction === "atMost" ? "até" : "a partir de"} {numberLabel(goal.target)} {goal.unit === "score" ? "pts" : "por treino"}</p>
            <small>{result.count} registros{goal.deadline && ` · Prazo ${formatDate(goal.deadline)}`}</small>
            {ratio !== null && <label><progress max="1" value={ratio} aria-label={`Percentual do alvo de ${goal.label}`} />{numberLabel(ratio * 100)}%</label>}
          </article>;
        }) : <p>Nenhuma meta em andamento.</p>}
        <footer><Button variant="ghost" icon={ArrowRight} onClick={() => navigate("athlete-goals")}>Consultar metas</Button></footer>
      </section>
    </CardGrid>
    {role === "GOALKEEPER" && <GoalkeeperSummary records={trainings.map(t => t.athletes[athleteId])} />}
  </div>;
}
