import { useState } from "react";
import { Button } from "../../components/ui/Button.jsx";
import { goalProgress } from "../../../shared/personalGoals.js";
import { numberLabel } from "./model/personalPanel.js";
import { formatDate } from "../../utils/formatters.js";

export function GoalResult({ goal, rows, today }) {
  const result = goalProgress(goal, rows, today);
  return <div><strong>{goal.label}</strong><p>Média {numberLabel(result.average)} · Alvo {goal.direction === "atMost" ? "até" : "a partir de"} {numberLabel(goal.target)} {goal.unit === "score" ? "pts" : "por treino"}</p>
    <small>{result.status} · {result.count} registros{goal.deadline && ` · Prazo ${formatDate(goal.deadline)}`}</small></div>;
}

export function PersonalGoals({ goals, rowsFor, criteria, today, save }) {
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const field = (key, value) => setEditing(form => ({ ...form, [key]: value }));
  async function submit(id, body) {
    setBusy(true); setMessage("");
    try { await save(id, body); setEditing(null); setMessage("Meta atualizada."); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  const metric = criteria.find(c => c.id === editing?.metric);
  const active = goals.filter(g => !g.archived), archived = goals.filter(g => g.archived);
  return <div className="page-stack personal-goals">
    {message && <p role="status">{message}</p>}
    <section className="panel page-stack"><h2>Metas pessoais</h2>
      <p>Acompanhe sua média por critério, considerando as avaliações registradas até o prazo.</p>
      {!editing && <Button disabled={!criteria.length} onClick={() => setEditing({ metric: criteria[0].id, target: "", deadline: "", direction: "atLeast" })}>Criar meta</Button>}
      {!criteria.length && <p>Nenhum critério configurado para o seu perfil.</p>}
      {editing && <form className="page-stack" onSubmit={e => { e.preventDefault(); submit(editing.id, { metric: editing.metric, direction: editing.direction, target: Number(editing.target), deadline: editing.deadline || null }); }}>
        <fieldset className="personal-filters" disabled={busy}><label>Critério<select required value={editing.metric} onChange={e => field("metric", e.target.value)}>
          {!metric && <option value="">Escolha um critério atual</option>}{criteria.map(c => <option key={c.id} value={c.id}>{c.label} · {c.unit === "score" ? "nota" : "quantidade"}</option>)}</select></label>
          <label>Objetivo<select value={editing.direction} onChange={e => field("direction", e.target.value)}><option value="atLeast">Média mínima</option><option value="atMost">Média máxima</option></select></label>
          <label>Valor-alvo<input required type="number" min="0" max={metric?.unit === "score" ? 10 : 2147483647} step="any" value={editing.target} onChange={e => field("target", e.target.value)} /></label>
          <label>Prazo opcional<input type="date" value={editing.deadline || ""} onChange={e => field("deadline", e.target.value)} /></label></fieldset>
        <div className="personal-actions"><Button type="submit" disabled={busy || !metric}>Salvar meta</Button><Button variant="ghost" disabled={busy} onClick={() => setEditing(null)} type="button">Cancelar</Button></div>
      </form>}
    </section>
    {!active.length && <p className="panel">Você ainda não tem metas ativas nesta equipe.</p>}
    {active.map(g => <article key={g.id} className="panel personal-row"><GoalResult goal={g} rows={rowsFor(g)} today={today} />
      <div className="personal-actions"><Button variant="ghost" disabled={busy} onClick={() => setEditing({ ...g, metric: criteria.some(c => c.id === g.metric) ? g.metric : "" })}>Editar</Button>
      <Button variant="ghost" disabled={busy} onClick={() => submit(g.id, { archived: true })}>Arquivar</Button></div></article>)}
    {!!archived.length && <details className="panel"><summary>Arquivadas ({archived.length})</summary>{archived.map(g => <GoalResult key={g.id} goal={g} today={today} rows={rowsFor(g)} />)}</details>}
  </div>;
}
