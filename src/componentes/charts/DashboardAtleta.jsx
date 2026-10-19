import { useEffect, useId, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown } from "lucide-react";
import "../../styles/paginasTreinador/GraficoEvolucaoEquipe.css";
import "../../styles/paginasTreinador/DashboardAtleta.css";

const scoreFormat = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const presenceFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const series = [
  { key: "desempenho", label: "Média de notas", color: "#8884d8" },
  { key: "presenca", label: "Média de presença", color: "#82ca9d" }
];

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

function AthleteTooltip({ active, payload }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return <div className="team-evolution__tooltip">
    <strong>{point.name}</strong>
    <dl>
      <div><dt>Média de notas</dt><dd>{scoreFormat.format(point.desempenho)}/10</dd></div>
      <div><dt>Média de presença</dt><dd>{presenceFormat.format(point.presenca)}/100%</dd></div>
    </dl>
  </div>;
}

function AthleteAreaChart({ data }) {
  const gradientId = useId();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  // O seletor existente representa a nota em percentual; apenas convertemos a exibição para /10.
  const observations = data.map((point) => ({ ...point, desempenho: point.desempenho / 10 }));
  return <div className="team-evolution__area-plot" aria-label="Evolução individual das notas e da presença. Use as setas para consultar os treinos.">
    <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 0, height: 320 }}>
      <AreaChart data={observations} margin={{ top: 16, right: 0, bottom: 8, left: 0 }} accessibilityLayer>
        <defs>{series.map((item) => <linearGradient key={item.key} id={`${gradientId}-${item.key}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={item.color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={item.color} stopOpacity={0.03} />
        </linearGradient>)}</defs>
        <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" />
        <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} minTickGap={24}
          interval="preserveStartEnd" tickMargin={9} height={36} tickLine={false} axisLine={false} />
        <YAxis yAxisId="desempenho" domain={[0, 10]} ticks={[0, 5, 10]} tickFormatter={(value) => scoreFormat.format(value)}
          width={42} tick={{ fill: series[0].color, fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="presenca" orientation="right" domain={[0, 100]} ticks={[0, 50, 100]}
          tickFormatter={(value) => `${presenceFormat.format(value)}%`} width={46}
          tick={{ fill: series[1].color, fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip content={<AthleteTooltip />} cursor={{ stroke: "var(--line-strong)" }} isAnimationActive={false}
          wrapperStyle={{ outline: "none", zIndex: 2 }} />
        <Legend iconType="plainline" wrapperStyle={{ color: "var(--ink)", fontSize: "0.8rem" }} />
        {series.map((item) => <Area key={item.key} type="monotone" dataKey={item.key} yAxisId={item.key} name={item.label}
          stroke={item.color} strokeWidth={2} fill={`url(#${gradientId}-${item.key})`}
          dot={data.length === 1 ? { r: 3, fill: item.color, strokeWidth: 0 } : false} activeDot={{ r: 4 }}
          isAnimationActive={!reducedMotion} animationDuration={700} animationEasing="ease-out" />)}
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}

export function AthleteDashboard({ data, stats, athleteId }) {
  const desktop = useMediaQuery("(min-width: 1025px)");
  const [expanded, setExpanded] = useState(true);
  return <details className="panel athlete-dashboard" open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
    <summary className="athlete-dashboard__toggle">
      <h2>Dashboard do Atleta</h2><ChevronDown size={20} aria-hidden="true" />
    </summary>
    {expanded && <div className="athlete-dashboard__content">
      {data.length === 0 ? <p className="empty-content">Os dados de evolução aparecerão após os primeiros treinos deste atleta.</p>
        : desktop ? <AthleteAreaChart key={athleteId} data={data} />
          : <div className="team-evolution__summary">
            {series.map((item) => <div className="team-evolution__value" key={item.key}>
              <span className={`team-evolution__label team-evolution__label--${item.key}`}><i aria-hidden="true" />{item.label}</span>
              <strong>{item.key === "desempenho" ? `${scoreFormat.format(stats.averageScore)}/10` : `${presenceFormat.format(stats.presenceAverage)}/100%`}</strong>
              <small>{item.key === "desempenho" ? "Média das notas qualitativas" : "Média de presença nos treinos"}</small>
            </div>)}
          </div>}
    </div>}
  </details>;
}
