import "../../styles/PositionEvaluation.css";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { Button } from "./Botao.jsx";
import { KpiCard } from "./CartaoKpi.jsx";
import { aggregateGoalkeeperStats, goalkeeperFields, MIN_RANKING_EVALUATIONS, profileFor, criteriaFor, criterionKinds, evaluationProfiles, PROFILE_VERSION, validateTypedCriteria, validateGoalkeeperStats, validateProfile, weightedEvaluation, arithmeticEvaluation, initialRatings } from "../../../shared/evaluations.js";
import { scoreLabel } from "../../utils/athletePerformance.js";

export function GoalkeeperSummary({ records }) {
  if (!records.some((record) => record?.role === "GOALKEEPER" && record.goalkeeperStats)) return null;
  const stats = aggregateGoalkeeperStats(records);
  const rate = (value) => value === null ? "Sem dados" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return <section className="kpi-grid" aria-label="Indicadores dos goleiros">
    {[["Defesas", stats.saves ?? "Sem dados"], ["Gols sofridos", stats.goalsConceded ?? "Sem dados"],
      ["Eficiência defensiva", rate(stats.defensiveEfficiency)], ["Precisão das reposições", rate(stats.distributionAccuracy)],
      ["Eficiência das saídas", rate(stats.exitEfficiency)]].map(([label, value]) => <KpiCard key={label} icon={Activity} label={label} value={value} detail="Estatísticas observadas de goleiros" />)}
  </section>;
}
export function PositionRankings({ rankings }) {
  return <section className="panel best-athlete-panel"><div className="section-heading"><h2>Melhores médias por função</h2></div>
    <p className="athlete-note">Mínimo de {MIN_RANKING_EVALUATIONS} avaliações técnicas específicas. Empates: mais avaliações e identificador estável.</p>
    {[["OUTFIELD", "Melhor jogador de linha"], ["GOALKEEPER", "Melhor goleiro"]].map(([role, title]) => <div key={role} className="page-stack">
      <h3>{title}</h3>{rankings?.[role]?.length ? <ol>{rankings[role].map((athlete) => <li key={athlete.id}>
        {athlete.name} · {role === "GOALKEEPER" ? "Goleiro" : "Linha"} · {scoreLabel(athlete.score)} · {athlete.evaluationCount} avaliações
      </li>)}</ol> : <p className="empty-content">Ainda não há atletas com avaliações suficientes nesta função.</p>}
    </div>)}
  </section>;
}
export function PositionEvaluationEditor({ record, team, onSave, hideRatings = false, draftStats, draftMetrics, onDraftChange }) {
  const profile = record.criteriaSnapshot?.length ? record.criteriaSnapshot : profileFor({ ...team, modality: record.modality || team.modality }, record.role, record.position);
  const [ratings, setRatings] = useState(() => initialRatings(profile, record.ratings));
  const [stats, setStats] = useState(() => draftStats || record.goalkeeperStats || {});
  const [metrics, setMetrics] = useState(() => draftMetrics || record.metrics || {});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { setRatings(initialRatings(profile, record.ratings)); setStats(draftStats || record.goalkeeperStats || {}); setMetrics(draftMetrics || record.metrics || {}); }, [record.id, record.ratings, record.goalkeeperStats, record.metrics]);
  let preview = null;
  try { preview = (record.evaluationSource === "WEIGHTED" ? weightedEvaluation : arithmeticEvaluation)(profile, ratings).finalScore; } catch { /* incomplete form */ }
  async function save(event, kind) {
    event.preventDefault();
    setMessage(""); setSaving(true);
    try {
      if (kind === "ratings") (record.evaluationSource === "WEIGHTED" ? weightedEvaluation : arithmeticEvaluation)(profile, ratings);
      else if (kind === "stats") validateGoalkeeperStats(stats);
      await onSave(kind === "ratings" ? { ratings } : kind === "stats" ? { goalkeeperStats: stats } : { metrics });
      setMessage("Dados salvos.");
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  }
  if (!profile && !hideRatings) return <p className="form-hint">Defina a posição do atleta no cadastro antes de registrar a avaliação.</p>;
  return <div className="page-stack position-evaluation">
    {!hideRatings && <form onSubmit={(event) => save(event, "ratings")}><fieldset disabled={saving} className="athlete-profile-fields">
      <legend>Avaliação técnica · {record.position || "Posição não informada"}</legend>
      <div className="rating-grid">{profile.map((item) => <label key={item.name}><span>{item.name}</span>
        <input aria-label={`Nota: ${item.name}`} type="number" min="0" max="10" step="0.1" required value={ratings[item.name] ?? ""}
          onChange={(event) => setRatings((current) => ({ ...current, [item.name]: event.target.value === "" ? undefined : Number(event.target.value) }))} />
      </label>)}</div><p aria-live="polite">Nota final: {scoreLabel(preview)}</p><Button type="submit">Salvar avaliação</Button>
    </fieldset></form>}
    {record.role === "GOALKEEPER" && <details><summary>Estatísticas do goleiro (opcionais)</summary>
      <p className="form-hint">Preencha apenas ações observadas. Em branco significa não informado. Finalizações no alvo = defesas + gols sofridos.</p>
      <form onSubmit={(event) => save(event, "stats")}><fieldset disabled={saving} className="athlete-profile-fields"><div className="metric-grid">
        {Object.entries(goalkeeperFields).map(([key, label]) => <label key={key}>{label}<input type="number" min="0" step="1" value={stats[key] ?? ""}
          onChange={(event) => { const next = { ...stats, [key]: event.target.value === "" ? null : Number(event.target.value) }; setStats(next); onDraftChange?.({ stats: next }); }} /></label>)}
      </div><Button type="submit">Salvar estatísticas</Button></fieldset></form>
    </details>}
    {record.role === "OUTFIELD" && <details><summary>Estatísticas de linha</summary><form onSubmit={(event) => save(event, "metrics")}>
      <fieldset disabled={saving} className="athlete-profile-fields"><div className="metric-grid">{(team.objectiveCriteria || []).map((name) => <label key={name}>{name}
        <input type="number" min="0" step="1" value={metrics[name] ?? ""} onChange={(event) => { const next = { ...metrics }; if (event.target.value === "") delete next[name]; else next[name] = Number(event.target.value); setMetrics(next); onDraftChange?.({ metrics: next }); }} />
      </label>)}</div><Button type="submit">Salvar estatísticas</Button></fieldset></form></details>}
    {message && <p role={message === "Dados salvos." ? "status" : "alert"} className={`form-feedback form-feedback--${message === "Dados salvos." ? "success" : "error"}`}>{message}</p>}
  </div>;
}
export function PositionProfileSettings({ team, actions }) {
  const load = () => evaluationProfiles.map(([role]) => ({ modality: "Futsal", role, schemaVersion: PROFILE_VERSION,
    criteria: criterionKinds.flatMap(([kind]) => criteriaFor(team, role, kind)) }));
  const [profiles, setProfiles] = useState(load);
  const [selected, setSelected] = useState("OUTFIELD");
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setProfiles(load()); }, [team.id, team.evaluationProfiles]);
  const profile = profiles.find((item) => item.role === selected);
  function update(transform) { setMessage(null); setProfiles((current) => current.map((item) => item.role === selected ? { ...item, criteria: transform(item.criteria) } : item)); }
  async function save(event) {
    event.preventDefault(); setSaving(true); setMessage(null);
    try {
      const validated = profiles.map((item) => {
        try { return { ...item, criteria: validateTypedCriteria(item.criteria) }; }
        catch(error) { setSelected(item.role); throw error; }
      });
      await actions.updateTeam({ teamId: team.id, patch: { evaluationProfiles: validated, expectedUpdatedAt: team.updatedAt } });
      setMessage({ type: "success", text: "Perfis salvos. Os critérios e valores dos treinos anteriores foram preservados." });
    } catch (error) { setMessage({ type: "error", text: error.message }); } finally { setSaving(false); }
  }
  return <div className="page-stack position-profiles">
    <div className="evaluation-profile-navigation" role="group" aria-label="Perfil de avaliação">
      {evaluationProfiles.map(([role, label]) => <Button key={role} type="button" variant={selected === role ? "primary" : "secondary"} disabled={saving}
        aria-pressed={selected === role} onClick={() => setSelected(role)}>{label}</Button>)}
    </div>
    <p className="form-hint">Ala, pivô e fixo usam o perfil de Linha. Goleiros usam um perfil próprio. Notas e contagens são registradas separadamente; os treinos antigos mantêm seus critérios.</p>
    <form onSubmit={save}><fieldset disabled={saving} className="athlete-profile-fields"><legend>{evaluationProfiles.find(([role]) => role === selected)[1]}</legend>
      <div className="criteria-grid">{criterionKinds.map(([kind, title]) => {
        const criteria = profile.criteria.filter((item) => item.kind === kind);
        return <section className="criteria-column evaluation-criterion-group" key={kind} aria-label={title}>
          <div className="section-heading"><h3>{title}</h3><span className="athlete-note">{criteria.length}/4</span></div>
          <p className="form-hint">{kind === "QUALITATIVE" ? "Notas de 0 a 10, inicialmente 5. A média considera somente estas notas." : "Contagens reais, sem limite de 10 e sem participação na média. Em branco significa não informado."}</p>
          {!criteria.length && <p className="empty-content">Nenhum critério configurado neste grupo.</p>}
          {criteria.map((item, index) => <div className="criterion-row position-criterion" key={item.id}>
            <input aria-label={`${title}: critério ${index + 1}`} value={item.name} required maxLength={191}
              onChange={(event) => update((all) => all.map((old) => old.id === item.id ? { ...old, name: event.target.value } : old))} />
            <Button type="button" variant="ghost" aria-label={`Remover ${title.toLowerCase()}: critério ${index + 1}`}
              onClick={() => update((all) => all.filter((old) => old.id !== item.id))}>Remover</Button>
          </div>)}
          <Button type="button" variant="secondary" disabled={criteria.length >= 4}
            onClick={() => update((all) => [...all, { id: crypto.randomUUID(), kind, name: "" }])}>Adicionar critério {kind === "QUALITATIVE" ? "qualitativo" : "quantitativo"}</Button>
        </section>;
      })}</div>
      <Button type="submit">{saving ? "Salvando…" : "Salvar perfis de avaliação"}</Button>
    </fieldset></form>
    {message && <p className={`form-feedback form-feedback--${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.text}</p>}
  </div>;
}
