import { useEffect, useId, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate } from "../../utils/formatters.js";
import "../../styles/paginasTreinador/GraficoEvolucaoEquipe.css";

const series = [
  { key: "desempenho", name: "Desempenho médio", maximum: 10, ticks: [0, 5, 10], color: "#8884d8" },
  { key: "presenca", name: "Presença média", maximum: 100, ticks: [0, 50, 100], color: "#82ca9d" }
];
const scoreFormat = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const presenceFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
function valueLabel(point, key, summary = false) {
  return key === "desempenho"
    ? `${scoreFormat.format(point[key])} / 10`
    : `${presenceFormat.format(point[key])}${summary ? " / 100%" : "%"}`;
}

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

function TeamTooltip({ active, payload }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="team-evolution__tooltip">
      <strong>{formatDate(point.date)}</strong>
      <dl>{series.map((item) => <div key={item.key}>
        <dt>{item.name}</dt><dd>{valueLabel(point, item.key)}</dd>
      </div>)}</dl>
      <small>{point.recordCount} {point.recordCount === 1 ? "atleta registrado" : "atletas registrados"} no treino</small>
    </div>
  );
}

function DesktopTeamChart({ observations }) {
  const gradientId = useId();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const dates = new Map(observations.map((point) => [point.trainingId, point.name]));
  return (
    <>
      <p className="team-evolution__hint">Cada ponto representa um treino. Notas de 0 a 10 no eixo esquerdo e presença de 0 a 100% no direito.</p>
      <div className="team-evolution__area-plot" aria-label="Evolução das notas e da presença média por treino. Use as setas para consultar os treinos.">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 0, height: 320 }}>
          <AreaChart data={observations} margin={{ top: 16, right: 0, bottom: 8, left: 0 }} accessibilityLayer>
            <defs>
              {series.map((item) => <linearGradient key={item.key} id={`${gradientId}-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={item.color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={item.color} stopOpacity={0.03} />
              </linearGradient>)}
            </defs>
            <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" />
            <XAxis dataKey="trainingId" tickFormatter={(id) => dates.get(id)} tick={{ fill: "var(--muted)", fontSize: 13 }}
              minTickGap={24} interval="preserveStartEnd" tickMargin={9} height={36} tickLine={false} axisLine={false} />
            {series.map((item) => <YAxis key={item.key} yAxisId={item.key} orientation={item.key === "presenca" ? "right" : "left"}
              domain={[0, item.maximum]} ticks={item.ticks}
              tickFormatter={(value) => item.key === "presenca" ? `${presenceFormat.format(value)}%` : scoreFormat.format(value)}
              width={46} tick={{ fill: item.color, fontSize: 13 }} tickLine={false} axisLine={false} />)}
            <Tooltip content={<TeamTooltip />} cursor={{ stroke: "var(--line-strong)" }} isAnimationActive={false}
              wrapperStyle={{ outline: "none", zIndex: 2 }} />
            <Legend iconType="plainline" wrapperStyle={{ color: "var(--ink)", fontSize: "0.9rem" }} />
            {series.map((item) => <Area key={item.key} type="monotone" dataKey={item.key} yAxisId={item.key} name={item.name}
              stroke={item.color} strokeWidth={2} fill={`url(#${gradientId}-${item.key})`}
              dot={observations.length === 1 ? { r: 3, fill: item.color, strokeWidth: 0 } : false}
              activeDot={{ r: 4 }} isAnimationActive={!reducedMotion} animationDuration={700} animationEasing="ease-out" />)}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export function TeamEvolutionChart({ data = [], averages, title = "Evolução média da equipe" }) {
  // Mesmo breakpoint desktop da dashboard-grid; o gráfico não é montado no mobile.
  const desktop = useMediaQuery("(min-width: 1025px)");
  // Um treino sem registros não oferece observações para este gráfico.
  const observations = data.filter((point) => point.recordCount > 0);
  const single = observations.length === 1 ? observations[0] : null;
  return (
    <section className="panel team-evolution" aria-label={title}>
      <div className="section-heading">
        <div><span className="eyebrow">Dashboard</span><h2>{title}</h2></div>
        {single && <time className="team-evolution__date" dateTime={single.date}>{formatDate(single.date)}</time>}
      </div>
      {observations.length === 0 ? (
        <p className="empty-content">A evolução da equipe aparecerá após o registro dos primeiros treinos com atletas.</p>
      ) : desktop ? (
        <DesktopTeamChart observations={observations} />
      ) : (
        <>
          <div className="team-evolution__summary">
            {series.map((item) => <div className="team-evolution__value" key={item.key}>
              <span className={`team-evolution__label team-evolution__label--${item.key}`}><i aria-hidden="true" />{item.name}</span>
              <strong>{valueLabel(averages, item.key, true)}</strong>
              <small>{item.key === "desempenho" ? "Média das notas qualitativas" : "Média de presença nos treinos"}</small>
            </div>)}
          </div>
          {single && <p className="team-evolution__hint">Um treino registrado. A tendência aparecerá a partir do próximo treino com atletas.</p>}
        </>
      )}
    </section>
  );
}
