import { useState } from "react";
import { TrainingDetails } from "../training/TrainingHistory.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { formatDate } from "../../utils/formatters.js";
import { recordScore } from "../../../shared/evaluations.js";
import { filterEvolution, scoreLabel } from "./model/athletePerformance.js";
import { numberLabel } from "./model/personalPanel.js";

const presenceLabel = value => value === true ? "Presente" : value === false ? "Ausente" : "Não informada";

export function PersonalHistory({ team, trainings, athlete, today, panel, evaluationsOnly = false, onOpen }) {
  const [detail, setDetail] = useState(null);
  const [period, setPeriod] = useState("all");
  const [date, setDate] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const options = [...new Set(trainings.map(t => t.type).filter(Boolean))];
  const filtered = filterEvolution(evaluationsOnly ? trainings.filter(t => {
    const r = t.athletes[athlete.id];
    return r.present !== false && (recordScore(r) !== null || r.measurements?.some(m => Number.isFinite(m.value)) ||
      Object.values(r.metrics || {}).some(Number.isFinite) || Object.values(r.goalkeeperStats || {}).some(Number.isFinite) ||
      Object.values(r.ratings || {}).some(Number.isFinite));
  }) : trainings, period, today)
    .filter(t => (!date || t.date === date) && (!type || t.type === type) && (!status || presenceLabel(t.athletes[athlete.id].present) === status));
  return <section className="panel page-stack"><h2>{evaluationsOnly ? "Histórico de avaliações" : "Histórico de treinos"}</h2>
    {!evaluationsOnly && <dl className="athlete-facts personal-attendance"><div><dt>Treinos</dt><dd>{trainings.length}</dd></div><div><dt>Presenças</dt><dd>{panel.present}</dd></div>
      <div><dt>Ausências</dt><dd>{panel.absent}</dd></div><div><dt>Frequência</dt><dd>{panel.attendance === null ? "—" : numberLabel(panel.attendance) + "%"}</dd></div></dl>}
    <div className="personal-filters"><label>Período<select value={period} onChange={e => setPeriod(e.target.value)}><option value="all">Todo o histórico</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></label>
      <label>Tipo<select value={type} onChange={e => setType(e.target.value)}><option value="">Todos</option>{options.map(t => <option key={t}>{t}</option>)}</select></label>
      {evaluationsOnly ? <label>Data<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        : <label>Presença<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todas</option>{["Presente","Ausente","Não informada"].map(s => <option key={s}>{s}</option>)}</select></label>}
    </div>
    {!filtered.length && <p>Nenhum registro para estes filtros.</p>}
    {filtered.map(t => <article className="personal-row" key={t.id}><div><strong>{formatDate(t.date)} · {t.type}</strong><p>{presenceLabel(t.athletes[athlete.id].present)} · {scoreLabel(recordScore(t.athletes[athlete.id]))}</p></div>
      <Button variant="ghost" onClick={() => evaluationsOnly ? setDetail(t) : onOpen(t.id)}>Ver detalhes</Button></article>)}
    {evaluationsOnly && <TrainingDetails selected={detail} team={team} athleteId={athlete.id} onClose={() => setDetail(null)} />}
  </section>;
}
