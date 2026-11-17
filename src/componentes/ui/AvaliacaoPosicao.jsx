import "../../styles/PositionEvaluation.css";
import { useEffect, useState } from "react";
import { Crosshair, Goal, Send, Shield, ShieldCheck } from "lucide-react";
import { Button } from "./Botao.jsx";
import { KpiCard } from "./CartaoKpi.jsx";
import { CollapsiblePanel } from "./PainelRetratil.jsx";
import { aggregateGoalkeeperStats, goalkeeperFields, profileFor, criteriaFor, criterionKinds, evaluationProfiles, PROFILE_VERSION, validateTypedCriteria, validateGoalkeeperStats, weightedEvaluation, arithmeticEvaluation, initialRatings } from "../../../shared/evaluations.js";
import { scoreLabel } from "../../utils/athletePerformance.js";
import { positionMeasurements } from "../../utils/teamPerformance.js";
import { trainingCoverage } from "../../utils/formatters.js";
import { getTeamCriteria, normalizeModality } from "../../../shared/criteria.js";

export function GoalkeeperSummary({ records, compact = false, initialOpen = true }) {
  const stats = aggregateGoalkeeperStats(records);
  const rate = (value) => value === null ? "Sem dados" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  const indicators = [
    ["saves", "Defesas", Shield], ["goalsConceded", "Gols sofridos", Goal],
    ["defensiveEfficiency", "Eficiência defensiva", ShieldCheck, rate],
    ["distributionAccuracy", "Precisão das reposições", Send, rate],
    ["exitEfficiency", "Eficiência das saídas", Crosshair, rate]
  ];
  const metrics = <section className={compact ? "team-home__metrics" : "position-metrics"} aria-label="Estatísticas observadas dos goleiros">
    {indicators.map(([key, label, Icon, format]) => <KpiCard key={key} icon={Icon} label={label}
      value={format ? format(stats[key]) : stats[key] ?? "Sem dados"}
      detail={trainingCoverage(stats.coverage.byIndicator[key], stats.coverage.total)} />)}
  </section>;
  return compact ? metrics : <CollapsiblePanel title="Estatísticas de goleiro" initialOpen={initialOpen}>{metrics}</CollapsiblePanel>;
}

export function OutfieldSummary({ team, records, initialOpen = true }) {
  const criteria = criteriaFor(team, "OUTFIELD", "QUANTITATIVE") || [];
  const measurements = positionMeasurements(records, "OUTFIELD", criteria);

  return <CollapsiblePanel title="Estatísticas de linha" initialOpen={initialOpen}>
    {measurements.length ? <div className="position-metrics">
      {measurements.map(({ id, label, value, validTrainings, totalTrainings }) => <KpiCard key={id} icon={Crosshair} label={label}
        value={value?.toLocaleString("pt-BR") ?? "Sem dados"} detail={trainingCoverage(validTrainings, totalTrainings)} />)}
    </div> : <p className="empty-content">Nenhuma medida quantitativa configurada para jogadores de linha.</p>}
  </CollapsiblePanel>;
}

export function PositionEvaluationEditor({ record, team, onSave, hideRatings = false, disabled = false, draftStats, draftMetrics, onDraftChange }) {
  const profile = record.criteriaSnapshot?.length ? record.criteriaSnapshot : profileFor({ ...team, modality: record.modality || team.modality }, record.role, record.position);
  const [ratings, setRatings] = useState(() => initialRatings(profile, record.ratings));
  const [statEdits, setStatEdits] = useState({});
  const [metricEdits, setMetricEdits] = useState({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => setRatings(initialRatings(profile, record.ratings)), [record.id, record.ratings]);
  useEffect(() => { setStatEdits({}); setMetricEdits({}); }, [record.id]);
  const stats = draftStats ?? statEdits;
  const metrics = draftMetrics ?? metricEdits;
  const statValues = { ...record.goalkeeperStats, ...stats };
  const metricValues = { ...record.metrics, ...metrics };
  const futsal = normalizeModality(record.modality || team.modality) === "Futsal";
  const storedMetrics = Object.keys(record.metrics || {});
  const metricNames = futsal && hideRatings ? storedMetrics : [...new Set([...getTeamCriteria(team, "objective"), ...storedMetrics])];

  function changeStats(next) {
    setStatEdits(next);
    onDraftChange?.({ stats: next });
  }
  function changeMetrics(next) {
    setMetricEdits(next);
    onDraftChange?.({ metrics: next });
  }
  let preview = null;
  try { preview = (record.evaluationSource === "WEIGHTED" ? weightedEvaluation : arithmeticEvaluation)(profile, ratings).finalScore; } catch { /* incomplete form */ }
  async function save(event, kind) {
    event.preventDefault();
    setMessage(""); setSaving(true);
    try {
      if (kind === "ratings") (record.evaluationSource === "WEIGHTED" ? weightedEvaluation : arithmeticEvaluation)(profile, ratings);
      else if (kind === "stats") validateGoalkeeperStats(statValues);
      await onSave(kind === "ratings" ? { ratings } : kind === "stats" ? { goalkeeperStats: stats } : { metrics });
      if (kind === "stats") changeStats({});
      if (kind === "metrics") changeMetrics({});
      setMessage("Dados salvos.");
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  }
  if (!profile && !hideRatings) return <p className="form-hint">Defina a posição do atleta no cadastro antes de registrar a avaliação.</p>;
  return <div className="page-stack position-evaluation">
    {!hideRatings && <form onSubmit={(event) => save(event, "ratings")}><fieldset disabled={disabled || saving} className="athlete-profile-fields">
      <legend>Avaliação técnica · {record.position || "Posição não informada"}</legend>
      <div className="rating-grid">{profile.map((item) => <label key={item.name}><span>{item.name}</span>
        <input aria-label={`Nota: ${item.name}`} type="number" min="0" max="10" step="0.1" required value={ratings[item.name] ?? ""}
          onChange={(event) => setRatings((current) => ({ ...current, [item.name]: event.target.value === "" ? undefined : Number(event.target.value) }))} />
      </label>)}</div><p aria-live="polite">Nota final: {scoreLabel(preview)}</p><Button type="submit">Salvar avaliação</Button>
    </fieldset></form>}
    {record.role === "GOALKEEPER" && <details><summary>Estatísticas do goleiro (opcionais)</summary>
      <p className="form-hint">Preencha apenas ações observadas. Em branco significa não informado. Finalizações no alvo = defesas + gols sofridos.</p>
      <form onSubmit={(event) => save(event, "stats")}><fieldset disabled={disabled || saving} className="athlete-profile-fields"><div className="metric-grid">
        {Object.entries(goalkeeperFields).map(([key, label]) => <label key={key}>{label}<input type="number" min="0" max="2147483647" step="1" value={statValues[key] ?? ""}
          onChange={(event) => changeStats({ ...stats, [key]: event.target.value === "" ? null : Number(event.target.value) })} /></label>)}
      </div><Button type="submit" disabled={!Object.keys(stats).length}>Salvar estatísticas</Button></fieldset></form>
    </details>}
    {metricNames.length > 0 && (record.role === "OUTFIELD" || hideRatings && storedMetrics.length > 0) && <details>
      <summary>{futsal && record.role === "OUTFIELD" ? "Estatísticas de linha" : "Estatísticas esportivas"}</summary>
      <form onSubmit={(event) => save(event, "metrics")}>
        <fieldset disabled={disabled || saving} className="athlete-profile-fields"><div className="metric-grid">{metricNames.map((name) => <label key={name}>{name}
          <input type="number" min="0" max="2147483647" step="1" value={Object.hasOwn(metricValues, name) ? metricValues[name] ?? "" : ""}
            onChange={(event) => changeMetrics({ ...metrics, [name]: event.target.value === "" ? null : Number(event.target.value) })} />
        </label>)}</div><Button type="submit" disabled={!Object.keys(metrics).length}>Salvar estatísticas</Button></fieldset>
      </form>
    </details>}
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
