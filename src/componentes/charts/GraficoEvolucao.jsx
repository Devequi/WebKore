import { useEffect, useId, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate } from "../../utils/formatters.js";
import { evolutionPlot, filterEvolution, scoreLabel } from "../../utils/athletePerformance.js";
import { useTodayDate } from "../../hooks/useTodayDate.js";
import { CollapsiblePanel } from "../ui/PainelRetratil.jsx";
import { chartGrid, chartLegend, chartMargin, chartTooltip, chartXAxis, EvaluationGradient } from "./chartAppearance.jsx";
import "../../styles/paginasTreinador/GraficoEvolucaoEquipe.css";

const colors = ["#8884d8", "#82ca9d", "#ffc857", "#5b8def"];

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

export function EvolutionChart({ data = [], criteria = [], title = "Minha evolução" }) {
  const [period, setPeriod] = useState("all");
  // O contrato atual identifica os critérios pelos nomes únicos cadastrados na equipe.
  const [criterion, setCriterion] = useState("");
  const gradientId = useId();
  const today = useTodayDate();
  const selected = criteria.includes(criterion) ? criterion : "";
  useEffect(() => {
    if (criterion && !criteria.includes(criterion)) setCriterion("");
  }, [criteria, criterion]);

  const points = filterEvolution(data, period, today);
  const plot = evolutionPlot(points, criteria);
  const visible = plot.series.map((item, index) => ({ ...item, color: colors[index % colors.length] }))
    .filter((item) => !selected || item.name === selected);
  const evaluated = plot.data.filter((point) => visible.some((item) => Number.isFinite(point[item.key])));
  const dates = new Map(plot.data.map((point) => [point.trainingId, formatDate(point.date).slice(0, 5)]));
  const Chart = selected ? AreaChart : LineChart;

  return <CollapsiblePanel title={title} eyebrow="Avaliações do treinador" className="chart-panel athlete-evolution"
    headingClassName="athlete-evolution__heading" actions={<label className="athlete-evolution__selector">Visualização
        <select value={selected} onChange={(event) => setCriterion(event.target.value)}>
          <option value="">Visão geral</option>{criteria.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>}>
    <div className="athlete-chart-filters">
      <label>Período<select value={period} onChange={(event) => setPeriod(event.target.value)}>
        <option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="all">Todo o histórico</option>
      </select></label>
    </div>
    {!evaluated.length ? <p className="empty-content" role="status">{emptyMessage(data, points, selected)}</p> : <>
      <p className="athlete-note">{evaluated.length === 1 ? "Uma avaliação disponível. Novos registros permitirão acompanhar a evolução." : "Notas de 0 a 10. Lacunas indicam treinos sem avaliação."}</p>
      <div className="team-evolution__area-plot" aria-label={`${title}: ${selected || "visão geral"}, notas de zero a dez. Use as setas para consultar os treinos.`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 0, height: 320 }}>
          <Chart data={plot.data} margin={chartMargin} accessibilityLayer>
            {selected && <defs><EvaluationGradient id={gradientId} color={visible[0].color} /></defs>}
            <CartesianGrid {...chartGrid} />
            <XAxis dataKey="trainingId" tickFormatter={(id) => dates.get(id)} {...chartXAxis} />
            <YAxis domain={[0, 10]} ticks={[0, 5, 10]} width={42} tick={{ fill: "var(--muted)", fontSize: 13 }} tickLine={false} axisLine={false} />
            <Tooltip content={<EvaluationTooltip />} {...chartTooltip} allowEscapeViewBox={{ x: false, y: false }} />
            <Legend {...chartLegend} />
            {visible.map((item) => {
              const Series = selected ? Area : Line;
              return <Series key={item.name} dataKey={item.key} name={item.name} stroke={item.color} strokeWidth={2}
                fill={selected ? `url(#${gradientId})` : "none"} type="linear"
                dot={{ r: evaluated.length === 1 ? 4 : 3, fill: item.color, strokeWidth: 0 }} activeDot={{ r: 4 }}
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
