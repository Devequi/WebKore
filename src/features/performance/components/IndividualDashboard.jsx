import { CardGrid } from "../../../components/ui/CardGrid.jsx";
import { KpiCard } from "../../../components/ui/KpiCard.jsx";
import { useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Minus, TrendingUp } from "lucide-react";
import { useTodayDate } from "../../../hooks/useTodayDate.js";
import { formatDate, trainingCoverage } from "../../../utils/formatters.js";
import { individualEvolution, individualSeries } from "../model/individualEvolution.js";
import { CollapsiblePanel } from "../../../components/ui/CollapsiblePanel.jsx";
import { chartSeries } from "./chartAppearance.jsx";
import { EvolutionPlot } from "./EvolutionPlot.jsx";
import { TrainingDetails } from "../../training/TrainingHistory.jsx";

const title = "Evolução de desempenho";
const evaluationGroups = { qualitative: "Qualitativas", quantitative: "Quantitativas" };
const modeLabels = { average: "Média geral", ...evaluationGroups };
const goalkeeperModeLabels = { average: "Média geral", evaluations: "Avaliações", statistics: "Estatísticas" };
const formatNumber = (value) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const units = {
  score: { format: (value) => `${formatNumber(value)}/10`, description: "notas de zero a dez", delta: "pts" },
  count: { format: formatNumber, description: "contagem por treino", delta: "",
    axis: { domain: [0, (max) => Math.max(1, max)], allowDecimals: false, width: "auto" } },
  percent: { format: (value) => `${formatNumber(value)}%`, description: "porcentagem", delta: "p.p.",
    axis: { domain: [0, 100], ticks: [0, 50, 100], tickFormatter: (value) => `${value}%`, width: 45 } }
};

function EvolutionChange({ change, unit }) {
  if (change === null) return null;
  const rounded = Math.round(Math.abs(change) * 100) / 100;
  const direction = !rounded ? "neutral" : change > 0 ? "positive" : "negative";
  const Icon = { neutral: Minus, positive: ArrowUp, negative: ArrowDown }[direction];
  const sign = { neutral: "", positive: "+", negative: "−" }[direction];
  const suffix = unit.delta ? ` ${unit.delta}` : "";
  return <span className="individual-evolution__change" data-direction={direction} aria-live="polite"
    title="Variação do primeiro para o último valor válido">
    <Icon size={16} aria-hidden="true" /><span className="individual-evolution__visually-hidden">Variação </span>{sign}{formatNumber(rounded)}{suffix}
  </span>;
}

export function AthleteDashboard({ trainings, athlete, team, showSummary = false }) {
  const [period, setPeriod] = useState("all");
  const [mode, setMode] = useState("average");
  const [group, setGroup] = useState("qualitative");
  const [criterion, setCriterion] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const today = useTodayDate();
  const { rows, modes, isGoalkeeper, outsideProfile } = individualEvolution({ trainings, athlete, team, period, today });
  const views = isGoalkeeper ? goalkeeperModeLabels : modeLabels;
  const view = Object.hasOwn(views, mode) ? mode : "average";
  const grouped = view === "evaluations";
  const statistics = view === "statistics";
  const options = modes[grouped ? group : view];
  const metric = options.find((item) => item.id === criterion) || options[0];
  const selectionLabel = statistics ? "Indicador" : "Critério";
  const tableLabel = grouped ? `${views[view]} · ${evaluationGroups[group]}` : views[view];
  const unit = units[metric?.unit || "score"];
  const { data, table, change, count } = individualSeries(rows, metric);
  const coverage = metric && metric.unit !== "score" ? trainingCoverage(count, table.length) : null;

  const summaryAllowed = view === "average" || view === "qualitative" || (grouped && group === "qualitative");
  const observed = showSummary && summaryAllowed ? data.filter(row => Number.isFinite(row.value)) : [];
  const first = observed[0], last = observed.at(-1);
  const summaryChange = observed.length === 1 ? 0 : change;
  const emptyDetail = summaryAllowed ? "Sem avaliações válidas no período" : "Disponível para média geral e critérios qualitativos";
  const criterionDetail = view === "average" ? "registro" : `nota de ${metric?.label || "critério"}`;

  return <>
    {showSummary && <CardGrid columns={3} className="athlete-kpis" label="Resumo da evolução">
      <KpiCard icon={CalendarDays} label="Primeira avaliação" value={first ? units.score.format(first.value) : "—"}
        detail={first ? `Primeira ${criterionDetail === "registro" ? "avaliação" : criterionDetail} no período · ${formatDate(first.date)}` : emptyDetail} />
      <KpiCard icon={TrendingUp} label="Evolução total"
        value={first ? <EvolutionChange change={summaryChange} unit={units.score} /> : "—"}
        detail={first ? "Entre a primeira e a última avaliação" : emptyDetail} />
      <KpiCard icon={CalendarDays} label="Última avaliação" value={last ? units.score.format(last.value) : "—"}
        detail={last ? `Última ${criterionDetail === "registro" ? "avaliação" : criterionDetail} no período · ${formatDate(last.date)}` : emptyDetail} />
    </CardGrid>}
    <CollapsiblePanel title={title} className="chart-panel individual-evolution"
    headingClassName="individual-evolution__heading" actions={<EvolutionChange change={change} unit={unit} />}>
    <div className="individual-evolution__filters" data-grouped={grouped || undefined}>
      <label>Visualização<select value={view} onChange={(event) => { setMode(event.target.value); setCriterion(""); }}>
        {Object.entries(views).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      {grouped && <label>Grupo<select value={group} onChange={(event) => { setGroup(event.target.value); setCriterion(""); }}>
        {Object.entries(evaluationGroups).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>}
      {view !== "average" && <label>{selectionLabel}<select value={metric?.id || ""} disabled={!options.length} onChange={(event) => setCriterion(event.target.value)}>
        {!options.length && <option value="">{statistics ? "Sem estatísticas no período" : "Sem critérios disponíveis"}</option>}
        {options.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
      </select></label>}
      <label>Período<select value={period} onChange={(event) => setPeriod(event.target.value)}>
        <option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="all">Todo o histórico</option>
      </select></label>
    </div>
    {count ? <EvolutionPlot data={data} series={[{ ...chartSeries[0], key: "value", name: metric.label }]} area tapTooltip
      evaluatedCount={count} yAxis={unit.axis} formatValue={unit.format} xAxis={{ minTickGap: 32 }}
      label={`${title}: ${metric.label}, ${unit.description}. Use as setas para consultar os treinos.`} />
      : <p className="empty-content" role="status">{rows.length
        ? "Sem valores registrados para esta visualização." : "Sem registros do perfil atual neste período."}</p>}
    {outsideProfile > 0 && <p className="athlete-note individual-evolution__history-note">Registros de outros perfis ou sem posição registrada estão no histórico de treinos.</p>}
    {coverage && <p className="athlete-note">{coverage}</p>}
    {table.length > 0 && <details className="athlete-chart-table">
      <summary>Consultar notas em tabela</summary>
      <div className="athlete-table-scroll"><table>
        {isGoalkeeper && <caption className="individual-evolution__visually-hidden">{tableLabel}</caption>}
        <thead><tr><th scope="col">Treino</th><th scope="col">{metric?.label || "Registro"}</th></tr></thead>
        <tbody>{table.map((row) => <tr key={row.trainingId}>
          <td><button type="button" className="individual-evolution__training" aria-haspopup="dialog" onClick={() => setSelectedId(row.trainingId)}>
            <time dateTime={row.date}>{formatDate(row.date)}</time>
            <small>{row.title || `Treino ${row.type || "registrado"}`}</small>
            <span className="individual-evolution__visually-hidden"> · Ver detalhes</span>
          </button></td>
          <td>{row.present === false ? "Ausente" : row.value !== null ? unit.format(row.value) : "Sem registro"}</td>
        </tr>)}</tbody>
      </table></div>
    </details>}
    <TrainingDetails selected={trainings.find((training) => training.id === selectedId)} athleteId={athlete.id} onClose={() => setSelectedId(null)} />
  </CollapsiblePanel>
  </>;
}
