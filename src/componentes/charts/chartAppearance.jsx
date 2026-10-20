// Padrão do gráfico de área do treinador, compartilhado sem alterar sua escala.
export const chartMargin = { top: 16, right: 0, bottom: 8, left: 0 };
export const chartGrid = { vertical: false, stroke: "var(--line)", strokeDasharray: "3 5" };
export const chartXAxis = {
  tick: { fill: "var(--muted)", fontSize: 13 }, minTickGap: 24,
  interval: "preserveStartEnd", tickMargin: 9, height: 36, tickLine: false, axisLine: false
};
export const chartLegend = { iconType: "plainline", wrapperStyle: { color: "var(--ink)", fontSize: "0.9rem" } };
export const chartTooltip = { cursor: { stroke: "var(--line-strong)" }, isAnimationActive: false,
  wrapperStyle: { outline: "none", zIndex: 2 } };

export function EvaluationGradient({ id, color }) {
  return <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor={color} stopOpacity={0.4} />
    <stop offset="100%" stopColor={color} stopOpacity={0.03} />
  </linearGradient>;
}
