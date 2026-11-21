import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatDate } from "../../../utils/formatters.js";
import { evolutionPlot, filterEvolution, scoreLabel } from "../model/athletePerformance.js";
import { useTodayDate } from "../../../hooks/useTodayDate.js";
import { CollapsiblePanel } from "../../../components/ui/CollapsiblePanel.jsx";
import { chartSeries } from "./chartAppearance.jsx";
import { EvolutionPlot } from "./EvolutionPlot.jsx";

function emptyMessage(data, points, criterion) {
  if (!data.length) return "Nenhum treino registrado. Sua evolução aparecerá após os primeiros registros do treinador.";
  if (!points.length) return "Nenhum treino registrado neste período. Escolha outro período para consultar seu histórico.";
  if (criterion) return `Ainda não há notas de ${criterion} neste período.`;
  return "Os treinos deste período ainda não possuem avaliações do treinador.";
}

export function EvolutionChart({ data = [], criteria: suppliedCriteria = [], title = "Minha evolução", dashboard, viewControl, scope, icon, footer, yAxis }) {
  const hasWeighted = data.some((point) => ["WEIGHTED", "AVERAGE"].includes(point.evaluationSource));
  const criteria = hasWeighted ? [...new Set(["Nota final", ...suppliedCriteria])] : suppliedCriteria;
  if (hasWeighted) data = data.map((point) => ({ ...point, ratings: { ...point.ratings, "Nota final": ["WEIGHTED", "AVERAGE"].includes(point.evaluationSource) ? point.finalScore : null } }));
  const [period, setPeriod] = useState("all");
  // O contrato atual identifica os critérios pelos nomes únicos cadastrados na equipe.
  const [criterion, setCriterion] = useState("");
  const today = useTodayDate();
  const selected = criteria.includes(criterion) ? criterion : "";
  useEffect(() => {
    if (criterion && !criteria.includes(criterion)) setCriterion("");
  }, [criteria, criterion]);
  useEffect(() => { setCriterion(""); }, [scope]);

  const points = filterEvolution(data, period, today);
  const averageLabel = "Média geral";
  const averageView = dashboard && !selected;
  const plot = averageView
    ? evolutionPlot(points.map((point) => ({ ...point, ratings: { [averageLabel]: point.averageScore } })), [averageLabel])
    : evolutionPlot(points, dashboard ? [selected] : criteria);
  const visible = plot.series.map((item, index) => ({ ...item, ...chartSeries[index % chartSeries.length],
    ...(selected ? { color: "var(--chart-primary)", dash: undefined } : {}) }))
    .filter((item) => !selected || item.name === selected);
  const evaluated = plot.data.filter((point) => visible.some((item) => Number.isFinite(point[item.key])));
  const periodControl = <label>Período<select value={period} onChange={(event) => setPeriod(event.target.value)}>
    <option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="all">Todo o histórico</option>
  </select></label>;
  const criterionControl = <select value={selected} onChange={(event) => setCriterion(event.target.value)}>
    <option value="">{dashboard ? averageLabel : "Visão geral"}</option>{criteria.map((name) => <option key={name} value={name}>{name}</option>)}
  </select>;

  return <CollapsiblePanel title={title} icon={icon} eyebrow={dashboard ? null : "Avaliações do treinador"} className="chart-panel athlete-evolution"
    headingClassName="athlete-evolution__heading" actions={<>
      {(!dashboard || criteria.length > 0) && <label className="athlete-evolution__selector">{dashboard ? "Indicador" : "Visualização"}
        {dashboard ? <span className="team-home__criterion-control">
          {criterionControl}
          <span aria-hidden="true">{selected || averageLabel}</span><ChevronDown size={16} aria-hidden="true" />
        </span> : criterionControl}
      </label>}{dashboard && <div className="team-home__period">{periodControl}</div>}</>}>
    {viewControl}
    {!dashboard && <div className="athlete-chart-filters">{periodControl}</div>}
    {!evaluated.length ? <p className="empty-content" role="status">{dashboard
      ? points.length ? "Sem avaliações neste recorte." : "Sem treinos neste período."
      : emptyMessage(data, points, selected)}</p> : <>
      {!dashboard && <p className="athlete-note">{evaluated.length === 1 ? "Uma avaliação disponível. Novos registros permitirão acompanhar a evolução." : "Notas de 0 a 10. Lacunas indicam treinos sem avaliação."}</p>}
      <EvolutionPlot yAxis={yAxis} data={plot.data} series={visible} area={dashboard || selected} showLegend={!dashboard}
        evaluatedCount={evaluated.length}
        label={`${title}: ${selected || "visão geral"}, notas de zero a dez. Use as setas para consultar os treinos.`} />
      <details className="athlete-chart-table"><summary>Consultar notas em tabela</summary><div className="athlete-table-scroll"><table>
        <thead><tr><th>Treino</th>{visible.map((item) => <th key={item.key}>{item.name}</th>)}</tr></thead>
        <tbody>{plot.data.map((point) => <tr key={point.trainingId}>
          <td>{formatDate(point.date)}<small>{point.title || (point.type ? `Treino ${point.type.toLowerCase()}` : point.trainingId)}</small></td>
          {visible.map((item) => <td key={item.key}>{scoreLabel(point[item.key])}</td>)}
        </tr>)}</tbody>
      </table></div></details>
    </>}
    {footer}
  </CollapsiblePanel>;
}
