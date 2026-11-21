import { useId, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate } from "../../../utils/formatters.js";
import { scoreLabel } from "../model/athletePerformance.js";
import { chartGrid, chartLegend, chartMargin, chartTooltip, chartXAxis, EvaluationGradient } from "./chartAppearance.jsx";
import "./EvolutionPlot.css";

function EvaluationTooltip({ active, payload, formatValue }) {
  const entries = payload?.filter((entry) => Number.isFinite(entry.value)) || [];
  const point = entries[0]?.payload;
  if (!active || !point) return null;
  return <div className="team-evolution__tooltip athlete-chart-tooltip">
    <strong>{formatDate(point.date)}</strong>
    <dl>{entries.map((entry) => <div key={entry.dataKey}>
      <dt><i style={{ background: entry.color }} aria-hidden="true" />{entry.name}</dt><dd>{formatValue(entry.value)}</dd>
    </div>)}</dl>
    {(point.title || point.type) && <small>{point.title || `Treino ${point.type.toLowerCase()}`}</small>}
  </div>;
}

const scoreAxis = { domain: [0, 10], ticks: [0, 5, 10] };

export function EvolutionPlot({ data, series, area, showLegend, label, evaluatedCount,
  yAxis = scoreAxis, xAxis, formatValue = scoreLabel, tapTooltip = false }) {
  const gradientId = useId();
  const [trigger, setTrigger] = useState("hover");
  const dates = new Map(data.map((point) => [point.trainingId, formatDate(point.date).slice(0, 5)]));
  const Chart = area ? AreaChart : LineChart;
  const Series = area ? Area : Line;
  return <div className="team-evolution__area-plot" aria-label={label}
    data-panel-interactive={tapTooltip ? "" : undefined}
    onPointerDown={tapTooltip ? (event) => {
      if (event.pointerType === "touch") setTrigger("click");
    } : undefined}
    onPointerMove={tapTooltip && trigger === "click" ? (event) => {
      if (event.pointerType === "mouse") setTrigger("hover");
    } : undefined}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 0, height: 320 }}>
      <Chart data={data} margin={chartMargin} accessibilityLayer>
        {area && <defs><EvaluationGradient id={gradientId} color={series[0].color} /></defs>}
        <CartesianGrid {...chartGrid} />
        <XAxis dataKey="trainingId" tickFormatter={(id) => dates.get(id)} {...chartXAxis} {...xAxis} />
        <YAxis width={42} tick={{ fill: "var(--muted)", fontSize: 13 }} tickLine={false} axisLine={false} {...yAxis} />
        <Tooltip content={<EvaluationTooltip formatValue={formatValue} />} trigger={trigger}
          {...chartTooltip} allowEscapeViewBox={{ x: false, y: false }} />
        {showLegend && <Legend {...chartLegend} />}
        {series.map((item) => <Series key={item.name} dataKey={item.key} name={item.name} stroke={item.color} strokeWidth={2}
          strokeDasharray={item.dash} fill={area ? `url(#${gradientId})` : "none"} type="linear"
          dot={{ r: evaluatedCount === 1 ? 4 : 3, fill: item.color, strokeWidth: 0 }}
          activeDot={{ r: 5, stroke: "var(--ink)", strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />)}
      </Chart>
    </ResponsiveContainer>
  </div>;
}
