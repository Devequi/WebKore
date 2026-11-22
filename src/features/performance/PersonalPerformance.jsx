import { CardGrid } from "../../components/ui/CardGrid.jsx";
import { KpiCard } from "../../components/ui/KpiCard.jsx";
import { ArrowDown, ArrowUp, ChartNoAxesColumnIncreasing, ChevronDown, Target, TrendingUp, Trophy } from "lucide-react";
import { useId, useState } from "react";
import { AthleteDashboard as IndividualChart } from "./components/IndividualDashboard.jsx";
import { PersonalHistory } from "./PersonalHistory.jsx";
import { filterEvolution } from "./model/athletePerformance.js";
import { numberLabel, signed } from "./model/personalPanel.js";
import { formatDate } from "../../utils/formatters.js";

export function Highlights({ highlights, detailed = false }) {
  const ranked = [...highlights].sort((a,b) => b.average - a.average);
  const rising = highlights.filter(c => c.change > 0).sort((a,b) => b.change - a.change);
  const best = ranked[0], lowest = ranked.at(-1), growth = rising[0];
  if (!detailed) {
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
  const attention = lowest?.average < best?.average ? lowest : null;
  return <section className="panel page-stack">
      <h2>Resumo pessoal</h2>
      <CardGrid columns={4} className="athlete-kpis">
        <KpiCard icon={Trophy} label="Melhor critério" value={best ? numberLabel(best.average) + "/10" : "—"} detail={best?.label} />
        <KpiCard icon={Target} label="Critério a melhorar" value={attention ? numberLabel(attention.average) + "/10" : "—"}
          detail={attention?.label || (best && "Sem diferença entre médias")} />
        <KpiCard icon={TrendingUp} label="Maior evolução" value={growth ? signed(growth.change) + " pts" : "—"}
          detail={growth?.label || (best && "Sem crescimento")} />
        <KpiCard icon={ChartNoAxesColumnIncreasing} label="Critérios em evolução" value={best ? rising.length : "—"} detail="Variações positivas" />
      </CardGrid>
      {!best && <p>Os destaques aparecem a partir de três notas de um critério, em pelo menos duas datas.</p>}
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
  const [period, setPeriod] = useState("all");
  const quantitative = panel.criteria.filter(c => c.kind === "quantitative");
  return <div className="page-stack">
    <nav className="personal-tabs" aria-label="Seções de desempenho">{["Evolução", "Critérios", "Análise pessoal", "Histórico de avaliações"].map(t =>
      <button key={t} type="button" aria-current={tab === t ? "page" : undefined} onClick={() => setTab(t)}>{t}</button>)}</nav>
    {tab === "Evolução" && <IndividualChart {...props} showSummary />}
    {tab === "Critérios" && <ProfileCriteria criteria={panel.criteria} rows={panel.rows} />}
    {tab === "Análise pessoal" && <div className="page-stack personal-analysis">
      <Highlights highlights={panel.highlights} detailed />
      <section className="panel page-stack">
        <header className="personal-row">
          <div><h2>Estatísticas de desempenho</h2><p>Seus resultados quantitativos acumulados nos treinos.</p></div>
          {quantitative.length > 0 && <select aria-label="Período das estatísticas" value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="all">Todo o histórico</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option>
          </select>}
        </header>
        {quantitative.length ? <CardGrid columns={4} className="athlete-kpis">
          {quantitative.map(({ id, label, history }) => {
            const records = filterEvolution(history, period, today);
            const total = records.reduce((sum, row) => sum + row.scores.get(id), 0);
            return <KpiCard key={id} icon={ChartNoAxesColumnIncreasing} label={label}
              value={records.length ? numberLabel(total) : "—"}
              detail={records.length ? `Média: ${numberLabel(total / records.length)} por treino` : "Sem registros no período"} />;
          })}
        </CardGrid> : <p>Nenhum critério quantitativo configurado para este perfil.</p>}
      </section>
    </div>}
    {tab === "Histórico de avaliações" && <PersonalHistory {...props} evaluationsOnly />}
  </div>;
}
