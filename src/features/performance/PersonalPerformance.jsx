import { useState } from "react";
import { AthleteDashboard as IndividualChart } from "./components/IndividualDashboard.jsx";
import { PersonalHistory } from "./PersonalHistory.jsx";
import { comparePeriods, mean, numberLabel, signed } from "./model/personalPanel.js";
import { formatDate } from "../../utils/formatters.js";

export function Highlights({ highlights, detailed = false }) {
  const ranked = [...highlights].sort((a,b) => b.average - a.average);
  const rising = highlights.filter(c => c.change > 0).sort((a,b) => b.change - a.change);
  const falling = highlights.filter(c => c.change < 0).sort((a,b) => a.change - b.change);
  if (!detailed) {
    const best = ranked[0], lowest = ranked.at(-1), growth = rising[0];
    const rows = [
      ["Ponto forte", best, best && numberLabel(best.average) + "/10"],
      ["Ponto de atenção", lowest?.average < best?.average ? lowest : null, lowest && numberLabel(lowest.average) + "/10"],
      ["Maior evolução", growth, growth && signed(growth.change) + " pts"]
    ];
    return <section className="panel page-stack"><h2>Destaques pessoais</h2>
      {ranked.length ? <dl className="page-stack">{rows.map(([label, criterion, value]) =>
        <div key={label}><dt><strong>{label}</strong></dt><dd>{criterion ? criterion.label + " (" + value + ")" : label === "Maior evolução" ? "Sem crescimento" : "Sem diferença entre médias"}</dd></div>)}</dl>
        : <p>Os destaques aparecem a partir de três notas de um critério, em pelo menos duas datas.</p>}</section>;
  }
  return <section className="panel page-stack"><h2>Destaques pessoais</h2>
    {!ranked.length ? <p>Os destaques aparecem a partir de três notas de um critério, em pelo menos duas datas.</p> :
      <><p><strong>Maior média</strong> · {ranked[0].label} ({numberLabel(ranked[0].average)}/10)</p>
        {ranked.at(-1).average < ranked[0].average && <p><strong>Menor média</strong> · {ranked.at(-1).label} ({numberLabel(ranked.at(-1).average)}/10)</p>}
        {(detailed ? rising : rising.slice(0,1)).map(c => <p key={c.id}>Evolução positiva · {c.label} ({signed(c.change)} pts)</p>)}
        {detailed && falling.map(c => <p key={c.id}>Queda · {c.label} ({signed(c.change)} pts)</p>)}</>}
  </section>;
}

export function PersonalPerformance(props) {
  const { panel, today } = props;
  const [tab, setTab] = useState("Evolução");
  const [days, setDays] = useState(30);
  const comparison = comparePeriods(panel.rows, today, days);
  return <div className="page-stack">
    <nav className="personal-tabs" aria-label="Seções de desempenho">{["Evolução", "Critérios", "Análise pessoal", "Histórico de avaliações"].map(t =>
      <button key={t} type="button" aria-current={tab === t ? "page" : undefined} onClick={() => setTab(t)}>{t}</button>)}</nav>
    {tab === "Evolução" && <IndividualChart {...props} />}
    {tab === "Critérios" && <section className="panel page-stack"><h2>Critérios do meu perfil</h2>
      {!panel.criteria.length && <p>Nenhum critério configurado.</p>}
      {panel.criteria.map(c => <details className="personal-criterion" key={c.id}><summary><strong>{c.label}</strong> · {c.unit === "score" ? "Qualitativo" : "Quantitativo"} · Média {numberLabel(c.average)} · {c.history.length} registros</summary>
        {panel.rows.length ? [...panel.rows].reverse().map(row => <p key={row.trainingId}>{formatDate(row.date)} · {row.type} · {row.scores.has(c.id) ? numberLabel(row.scores.get(c.id)) : "Sem registro"}</p>) : <p>Sem registros neste perfil.</p>}</details>)}</section>}
    {tab === "Análise pessoal" && <><Highlights highlights={panel.highlights} detailed />
      <section className="panel page-stack"><h2>Comparação de períodos</h2><label>Intervalo<select value={days} onChange={e => setDays(Number(e.target.value))}><option value={30}>30 dias</option><option value={90}>90 dias</option></select></label>
        <p>Últimos {days} dias · {numberLabel(mean(comparison.recent))} ({comparison.recent.length} avaliações)</p>
        <p>{days} dias anteriores · {numberLabel(mean(comparison.earlier))} ({comparison.earlier.length} avaliações)</p>
        <p>{comparison.change === null ? "Faltam avaliações em um dos períodos para comparar." : `Diferença entre médias: ${signed(comparison.change)} pts`}</p></section></>}
    {tab === "Histórico de avaliações" && <PersonalHistory {...props} evaluationsOnly />}
  </div>;
}
