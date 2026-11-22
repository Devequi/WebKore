import { ArrowDown, ArrowUp, ChevronDown, TrendingUp, Trophy } from "lucide-react";
import { useId, useState } from "react";
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
      [ArrowUp, "rise", "Ponto forte", best, best && numberLabel(best.average) + "/10"],
      [ArrowDown, "fall", "Ponto de atenção", lowest?.average < best?.average ? lowest : null, lowest && numberLabel(lowest.average) + "/10"],
      [TrendingUp, "trend", "Maior evolução", growth, growth && signed(growth.change) + " pts"]
    ];
    return <section className="panel summary-card"><header><h2><Trophy />Destaques pessoais</h2></header>
      {ranked.length ? <dl className="highlight-list">{rows.map(([Icon, tone, label, criterion, value]) =>
        <div key={label}><dt><Icon className={`highlight-icon metric-${tone}`} />{label}</dt>
          <dd>{criterion ? <><span>{criterion.label}</span><strong>{value}</strong></> : label === "Maior evolução" ? "Sem crescimento" : "Sem diferença entre médias"}</dd></div>)}</dl>
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

function CriterionRow({ criterion, rows, type }) {
  const [open, setOpen] = useState(false);
  const historyId = useId();
  const { label, average, history, unit, id } = criterion;
  return <div className="personal-criterion">
    <button type="button" aria-expanded={open} aria-controls={historyId} onClick={() => setOpen(!open)}>
      <strong>{label}</strong>
      <span className="criterion-meta">
        <span className="criterion-type">{type}</span>
        <span className="criterion-average">Média <b>{numberLabel(average)}</b>{Number.isFinite(average) && (unit === "score" ? "/10" : " por treino")}</span>
        <span>{history.length} {history.length === 1 ? "registro" : "registros"}</span>
      </span>
      <ChevronDown size={18} aria-hidden="true" />
    </button>
    <div className="criterion-history" id={historyId} hidden={!open}>
      {open && (rows.length ? rows.map(row => <p key={row.trainingId}>
        <time dateTime={row.date}>{formatDate(row.date)}</time><span>{row.type}</span>
        <strong>{row.scores.has(id) ? numberLabel(row.scores.get(id)) : "Sem registro"}</strong>
      </p>) : <p>Sem registros neste perfil.</p>)}
    </div>
  </div>;
}

function ProfileCriteria({ criteria, rows }) {
  const recentFirst = [...rows].reverse();
  return <section className="panel profile-criteria">
    <header><h2>Critérios do meu perfil</h2><p>Suas médias por critério de avaliação.</p></header>
    {!criteria.length && <p>Nenhum critério configurado.</p>}
    {Object.entries({ qualitative: "Qualitativo", quantitative: "Quantitativo" }).map(([kind, type]) => {
      const group = criteria.filter(c => c.kind === kind);
      if (!group.length) return null;
      return <section className="criterion-group" key={kind}>
        <header><h3>{type}s</h3><span>{group.length} {group.length === 1 ? "critério" : "critérios"}</span></header>
        {group.map(c => <CriterionRow key={c.id} criterion={c} rows={recentFirst} type={type} />)}
      </section>;
    })}
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
    {tab === "Critérios" && <ProfileCriteria criteria={panel.criteria} rows={panel.rows} />}
    {tab === "Análise pessoal" && <><Highlights highlights={panel.highlights} detailed />
      <section className="panel page-stack"><h2>Comparação de períodos</h2><label>Intervalo<select value={days} onChange={e => setDays(Number(e.target.value))}><option value={30}>30 dias</option><option value={90}>90 dias</option></select></label>
        <p>Últimos {days} dias · {numberLabel(mean(comparison.recent))} ({comparison.recent.length} avaliações)</p>
        <p>{days} dias anteriores · {numberLabel(mean(comparison.earlier))} ({comparison.earlier.length} avaliações)</p>
        <p>{comparison.change === null ? "Faltam avaliações em um dos períodos para comparar." : `Diferença entre médias: ${signed(comparison.change)} pts`}</p></section></>}
    {tab === "Histórico de avaliações" && <PersonalHistory {...props} evaluationsOnly />}
  </div>;
}
