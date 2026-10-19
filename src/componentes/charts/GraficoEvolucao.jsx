import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export function EvolutionChart({ data, title = "Evolução" }) {
  return (
    <section className="panel chart-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h2>{title}</h2>
        </div>
      </div>
      {data.length === 0 ? (
        <p className="empty-content">Os dados de evolução aparecerão após os primeiros treinos.</p>
      ) : (
      <div className="chart-box" aria-label={title}>
        <ResponsiveContainer width="100%" height={290} minWidth={0}>
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -24 }}>
            <CartesianGrid stroke="var(--line-strong)" strokeDasharray="4 4" />
            <XAxis dataKey="name" tick={{ fill: "var(--muted)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "var(--muted)" }} tickLine={false} axisLine={false} domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                border: "1px solid var(--line-strong)",
                borderRadius: 8,
                background: "var(--surface)",
                color: "var(--ink)",
                boxShadow: "var(--shadow)"
              }}
              labelStyle={{ color: "var(--ink)" }}
            />
            <Line
              type="monotone"
              dataKey="desempenho"
              name="Desempenho"
              stroke="var(--amber)"
              strokeWidth={3}
              dot={{ r: 4, fill: "var(--amber)" }}
            />
            <Line
              type="monotone"
              dataKey="presenca"
              name="Presença"
              stroke="var(--primary)"
              strokeWidth={3}
              dot={{ r: 4, fill: "var(--primary)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      )}
    </section>
  );
}
