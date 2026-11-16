import { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate } from "../../utils/formatters.js";
import { evolutionPlot, filterEvolution, scoreLabel } from "../../utils/athletePerformance.js";
import { useTodayDate } from "../../hooks/useTodayDate.js";
import { CollapsiblePanel } from "../ui/PainelRetratil.jsx";
import { chartGrid, chartLegend, chartMargin, chartSeries, chartTooltip, chartXAxis, EvaluationGradient } from "./chartAppearance.jsx";
import "../../styles/paginasTreinador/GraficoEvolucaoEquipe.css";

function EvaluationTooltip({ active, payload }) {
  const entries = payload?.filter((entry) => Number.isFinite(entry.value)) || [];
  const point = entries[0]?.payload;
  if (!active || !point) return null;
  return <div className="team-evolution__tooltip athlete-chart-tooltip">
    <strong>{formatDate(point.date)}</strong>
    <dl>{entries.map((entry) => <div key={entry.dataKey}>
      <dt><i style={{ background: entry.color }} aria-hidden="true" />{entry.name}</dt><dd>{scoreLabel(entry.value)}</dd>
    </div>)}</dl>
    {(point.title || point.type) && <small>{point.title || `Treino ${point.type.toLowerCase()}`}</small>}
  </div>;
}

function emptyMessage(data, points, criterion) {
  if (!data.length) return "Nenhum treino registrado. Sua evolução aparecerá após os primeiros registros do treinador.";
  if (!points.length) return "Nenhum treino registrado neste período. Escolha outro período para consultar seu histórico.";
  if (criterion) return `Ainda não há notas de ${criterion} neste período.`;
  return "Os treinos deste período ainda não possuem avaliações do treinador.";
}

export function EvolutionChart({ data = [], criteria: suppliedCriteria = [], title = "Minha evolução", dashboard, viewControl, scope }) {
  const hasWeighted = data.some((point) => ["WEIGHTED", "AVERAGE"].includes(point.evaluationSource));
  const criteria = hasWeighted ? [...new Set(["Nota final", ...suppliedCriteria])] : suppliedCriteria;
  if (hasWeighted) data = data.map((point) => ({ ...point, ratings: { ...point.ratings, "Nota final": ["WEIGHTED", "AVERAGE"].includes(point.evaluationSource) ? point.finalScore : null } }));
  const [period, setPeriod] = useState("all");
  // O contrato atual identifica os critérios pelos nomes únicos cadastrados na equipe.
  const [criterion, setCriterion] = useState("");
  const gradientId = useId();
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
  const dates = new Map(plot.data.map((point) => [point.trainingId, formatDate(point.date).slice(0, 5)]));
  const singleSeries = dashboard || selected;
  const Chart = singleSeries ? AreaChart : LineChart;
  const periodControl = <label>Período<select value={period} onChange={(event) => setPeriod(event.target.value)}>
    <option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="all">Todo o histórico</option>
  </select></label>;
  const criterionControl = <select value={selected} onChange={(event) => setCriterion(event.target.value)}>
    <option value="">{dashboard ? averageLabel : "Visão geral"}</option>{criteria.map((name) => <option key={name} value={name}>{name}</option>)}
  </select>;

  return <CollapsiblePanel title={title} eyebrow={dashboard ? null : "Avaliações do treinador"} className="chart-panel athlete-evolution"
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
      <div className="team-evolution__area-plot" aria-label={`${title}: ${selected || "visão geral"}, notas de zero a dez. Use as setas para consultar os treinos.`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 0, height: 320 }}>
          <Chart data={plot.data} margin={chartMargin} accessibilityLayer>
            {singleSeries && <defs><EvaluationGradient id={gradientId} color={visible[0].color} /></defs>}
            <CartesianGrid {...chartGrid} />
            <XAxis dataKey="trainingId" tickFormatter={(id) => dates.get(id)} {...chartXAxis} />
            <YAxis domain={[0, 10]} ticks={[0, 5, 10]} width={42} tick={{ fill: "var(--muted)", fontSize: 13 }} tickLine={false} axisLine={false} />
            <Tooltip content={<EvaluationTooltip />} {...chartTooltip} allowEscapeViewBox={{ x: false, y: false }} />
            {!dashboard && <Legend {...chartLegend} />}
            {visible.map((item) => {
              const Series = singleSeries ? Area : Line;
              return <Series key={item.name} dataKey={item.key} name={item.name} stroke={item.color} strokeWidth={2} strokeDasharray={item.dash}
                fill={singleSeries ? `url(#${gradientId})` : "none"} type="linear"
                dot={{ r: evaluated.length === 1 ? 4 : 3, fill: item.color, strokeWidth: 0 }} activeDot={{ r: 5, stroke: "var(--ink)", strokeWidth: 2 }}
                connectNulls={false} isAnimationActive={false} />;
            })}
          </Chart>
        </ResponsiveContainer>
      </div>
      <details className="athlete-chart-table"><summary>Consultar notas em tabela</summary><div className="athlete-table-scroll"><table>
        <thead><tr><th>Treino</th>{visible.map((item) => <th key={item.key}>{item.name}</th>)}</tr></thead>
        <tbody>{plot.data.map((point) => <tr key={point.trainingId}>
          <td>{formatDate(point.date)}<small>{point.title || (point.type ? `Treino ${point.type.toLowerCase()}` : point.trainingId)}</small></td>
          {visible.map((item) => <td key={item.key}>{scoreLabel(point[item.key])}</td>)}
        </tr>)}</tbody>
      </table></div></details>
    </>}
  </CollapsiblePanel>;
}
