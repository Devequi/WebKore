import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate } from "../../utils/formatters.js";
import "../../styles/paginasTreinador/GraficoEvolucaoEquipe.css";

const series = [
  { key: "desempenho", name: "Desempenho médio", unit: "nota de 0 a 10", maximum: 10, ticks: [0, 5, 10], color: "var(--primary)" },
  { key: "presenca", name: "Presença média", unit: "percentual de 0 a 100%", maximum: 100, ticks: [0, 50, 100], color: "var(--blue)" }
];
const scoreFormat = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
function valueLabel(point, key) {
  return key === "desempenho" ? `${scoreFormat.format(point[key])} / 10` : `${point[key]}%`;
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

export function TeamEvolutionChart({ data = [], title = "Evolução média da equipe" }) {
  // Um treino sem registros não oferece observações para este gráfico.
  const observations = data.filter((point) => point.recordCount > 0);
  const dates = new Map(observations.map((point) => [point.trainingId, point.name]));
  const single = observations.length === 1 ? observations[0] : null;
  return (
    <section className="panel team-evolution" aria-label={title}>
      <div className="section-heading">
        <div><span className="eyebrow">Dashboard</span><h2>{title}</h2></div>
        {single && <time className="team-evolution__date" dateTime={single.date}>{formatDate(single.date)}</time>}
      </div>
      {observations.length === 0 ? (
        <p className="empty-content">A evolução da equipe aparecerá após o registro dos primeiros treinos com atletas.</p>
      ) : single ? (
        <>
          <div className="team-evolution__summary">
            {series.map((item) => <div className="team-evolution__value" key={item.key}>
              <span className={`team-evolution__label team-evolution__label--${item.key}`}><i aria-hidden="true" />{item.name}</span>
              <strong>{valueLabel(single, item.key)}</strong>
              <small>{item.key === "desempenho" ? "Média das notas qualitativas" : "Atletas presentes neste treino"}</small>
            </div>)}
          </div>
          <p className="team-evolution__hint">Um treino registrado. A tendência aparecerá a partir do próximo treino com atletas.</p>
        </>
      ) : (
        <>
          <p className="team-evolution__hint">Cada ponto representa um treino. Notas qualitativas e presença têm escalas próprias.</p>
          {series.map((item) => <div className="team-evolution__series" key={item.key}>
            <div className="team-evolution__series-heading">
              <span className={`team-evolution__label team-evolution__label--${item.key}`}><i aria-hidden="true" />{item.name}</span>
              <small>{item.unit}</small>
            </div>
            <div className="team-evolution__plot" aria-label={`${item.name}: ${item.unit}. Use as setas para consultar os treinos.`}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 0, height: 145 }}>
                <LineChart data={observations} margin={{ top: 8, right: 14, bottom: 0, left: 0 }} accessibilityLayer>
                  <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" />
                  <XAxis dataKey="trainingId" tickFormatter={(id) => dates.get(id)} tick={{ fill: "var(--muted)", fontSize: 11 }}
                    minTickGap={24} interval="preserveStartEnd" tickMargin={9} height={30} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, item.maximum]} ticks={item.ticks} tickFormatter={(value) => item.key === "presenca" ? `${value}%` : value}
                    width={42} tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<TeamTooltip />} cursor={{ stroke: "var(--line-strong)" }} isAnimationActive={false}
                    wrapperStyle={{ outline: "none", zIndex: 2 }} />
                  <Line type="monotone" dataKey={item.key} name={item.name} stroke={item.color} strokeWidth={2}
                    strokeDasharray={item.key === "presenca" ? "5 3" : undefined}
                    dot={{ r: 2.5, fill: item.color, strokeWidth: 0 }} activeDot={{ r: 4 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>)}
        </>
      )}
    </section>
  );
}
