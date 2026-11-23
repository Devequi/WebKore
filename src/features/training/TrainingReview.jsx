import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/Button.jsx";
import { evaluationRole, goalkeeperFields, recordScore, validateGoalkeeperStats, validateMeasurements } from "../../../shared/evaluations.js";
import { criterionKey, getTeamCriteria, normalizeModality } from "../../../shared/criteria.js";
import { evaluationDraft, evaluationProfile, measurementProfile, draftScore } from "../evaluations/evaluationDraft.js";
import { scoreLabel } from "../performance/model/athletePerformance.js";
import { formatDate } from "../../utils/formatters.js";
import { ReviewNumber } from "./ReviewNumber.jsx";
import "./TrainingReview.css";

const keeperNames = new Map(Object.entries(goalkeeperFields).map(([key, name]) => [criterionKey(name), key]));
keeperNames.set("defesas", "saves");
keeperNames.set("reposicoes certas", "accurateDistributions");

export function TrainingReview({ training, athletes, team, actions, drafts, setDrafts }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const selector = useRef(null);
  const participants = athletes.filter(athlete => training.athletes[athlete.id]);
  if (!participants.length) return <p className="empty-content">Nenhum participante disponível.</p>;
  const index = Math.max(0, participants.findIndex(athlete => athlete.id === selected));
  const athlete = participants[index];
  const record = training.athletes[athlete.id];
  const position = record.position || athlete.position;
  const role = record.role || evaluationRole(record.modality, position);
  const profile = evaluationProfile(record, team, athlete);
  const quantitative = measurementProfile(record, team, athlete);
  const draft = drafts[athlete.id] || evaluationDraft(record, profile);
  const saved = recordScore(record) !== null;
  const score = draftScore(record, profile, draft.ratings);
  const evaluated = participants.filter(({ id }) => training.athletes[id].present !== false && recordScore(training.athletes[id]) !== null).length;
  const percent = Math.round(evaluated / participants.length * 100);
  const stats = { ...record.goalkeeperStats, ...draft.stats };
  const historicalNames = Object.keys(record.metrics || {});
  const metricNames = normalizeModality(record.modality || team.modality) === "Futsal" ? historicalNames :
    [...new Set([...getTeamCriteria(team, "objective"), ...historicalNames])];
  const step = !record.modality || record.evaluationSource === "LEGACY" || !record.role && !evaluationRole(team.modality, position) ? 1 : 0.1;
  const last = index === participants.length - 1;

  function patch(changes) {
    setMessage(null);
    setDrafts(old => ({ ...old, [athlete.id]: { ...(old[athlete.id] || draft), ...changes } }));
  }
  function select(id) {
    setSelected(id);
    setMessage(null);
  }

  // Display matching observations once. Preserve independently stored historical values
  // when they disagree, and update only the destinations explicitly edited.
  const fields = new Map();
  function addCount(group, key, name, storedValue, section) {
    const normalized = criterionKey(name);
    const identity = role === "GOALKEEPER" ? keeperNames.get(normalized) || normalized : normalized;
    let field = fields.get(identity);
    const distinct = field && (
      field.targets.some(target => target.group === group) ||
      field.storedValue != null && storedValue != null && field.storedValue !== storedValue
    );
    if (!field || distinct) {
      field = { name, storedValue, section, targets: [] };
      fields.set(distinct ? group + ":" + key : identity, field);
    }
    field.storedValue ??= storedValue;
    field.targets.push({ group, key });
    if (Object.hasOwn(draft[group] || {}, key)) field.editedValue = draft[group][key];
  }
  for (const item of quantitative) {
    addCount("measurements", item.criterionId || item.id, item.name, item.value, "measures");
  }
  if (role === "GOALKEEPER") {
    for (const [key, name] of Object.entries(goalkeeperFields)) addCount("stats", key, name, record.goalkeeperStats?.[key], "keeper");
  }
  for (const name of metricNames) addCount("metrics", name, name, record.metrics?.[name], "sports");

  function countCards(section) {
    return Array.from(fields.entries()).filter(([, field]) => field.section === section).map(([id, field]) =>
      <ReviewNumber key={id} name={field.name} label={`Quantidade: ${field.name}`} value={Object.hasOwn(field, "editedValue") ? field.editedValue : field.storedValue} onChange={value => {
        const changes = {};
        for (const { group, key } of field.targets) changes[group] = { ...draft[group], ...changes[group], [key]: value };
        patch(changes);
      }} />);
  }

  async function save(event) {
    event.preventDefault();
    const advance = event.nativeEvent.submitter?.value === "next" && !last;
    setMessage(null);
    const payload = { present: draft.present };
    try {
      if (draft.present) {
        if (profile?.length && (!saved || draft.dirty)) {
          if (score === null) throw new Error("Preencha todas as notas de 0 a 10.");
          payload.ratings = draft.ratings;
        }
        if (Object.keys(draft.measurements).length) {
          validateMeasurements(quantitative, draft.measurements);
          payload.measurements = draft.measurements;
        }
        if (draft.stats) {
          validateGoalkeeperStats(stats);
          payload.goalkeeperStats = draft.stats;
        }
        if (draft.metrics) payload.metrics = draft.metrics;
      }
      setSaving(true);
      await actions.updateTrainingAthlete({ trainingId: training.id, athleteId: athlete.id, patch: payload });
      setDrafts(old => {
        const next = { ...old };
        if (draft.present) delete next[athlete.id];
        return next;
      });
      if (advance) {
        setSelected(participants[index + 1].id);
        requestAnimationFrame(() => { selector.current?.focus(); selector.current?.scrollIntoView({ block: "center" }); });
      }
      setMessage({ type: "success", text: `Registro de ${athlete.name} salvo.` });
    } catch (error) {
      setMessage({ type: "error", text: `${error.message} Suas alterações foram mantidas.` });
    } finally { setSaving(false); }
  }
  const keeper = countCards("keeper");
  const sports = countCards("sports");
  return <div className="training-review">
    <section className="review-information" aria-label="Informações do treino">
      <h3>1. Informações do treino</h3><dl className="review-facts">
        <div><dt>Data</dt><dd>{formatDate(training.date)}</dd></div><div><dt>Tipo</dt><dd>{training.type}</dd></div>
        <div><dt>Equipe</dt><dd>{team.name}</dd></div><div><dt>Descrição</dt><dd>{training.description || "Sem descrição"}</dd></div>
      </dl>
    </section>
    <details className="review-roster"><summary>2. Participantes ({participants.length})</summary>
      <div className="review-roster-list">{participants.map(person => <button type="button" key={person.id} disabled={saving}
        aria-pressed={person.id === athlete.id} onClick={() => { select(person.id); selector.current?.focus(); }}>{person.name}</button>)}</div>
    </details>
    <section className="review-individual" aria-label="Avaliação individual">
      <header className="review-header"><h3>3. Avaliação individual</h3>
        <div className="review-progress"><span>{evaluated} de {participants.length} avaliados</span>
          <progress aria-label="Atletas avaliados" value={evaluated} max={participants.length} /><span>{percent}%</span></div>
      </header>
      <div className="review-navigation">
        <button type="button" disabled={saving || index === 0} aria-label="Atleta anterior" onClick={() => select(participants[index-1].id)}><ChevronLeft /></button>
        <select ref={selector} aria-label="Selecionar atleta" disabled={saving} value={athlete.id} onChange={event => select(event.target.value)}>
          {participants.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
        </select>
        <button type="button" disabled={saving || last} aria-label="Próximo atleta" onClick={() => select(participants[index+1].id)}><ChevronRight /></button>
      </div>
      <form onSubmit={save}><fieldset key={athlete.id} disabled={saving} className="review-fields">
        <div className="review-identity"><div><h4>{athlete.name}</h4><small>{position || "Posição não informada"}</small></div>
          {(draft.present !== (record.present !== false) || draft.present && (draft.dirty || Object.keys(draft.measurements).length > 0 || draft.stats || draft.metrics)) &&
            <small className="form-hint">Rascunho em edição</small>}
          <label className="review-checkbox"><input type="checkbox" checked={draft.present} onChange={event => patch({ present: event.target.checked })} />Participou do treino</label>
        </div>
        {!draft.present ? <p className="form-hint">Atleta ausente. Notas anteriores são preservadas.</p> : <>
          {!profile ? <p role="status">Defina uma posição válida no cadastro do atleta antes de avaliá-lo.</p> : <section>
            <h4>Avaliações qualitativas</h4>
            <p className="form-hint">{!profile.length ? "Nenhum critério qualitativo configurado." : saved ? "Revise as notas registradas antes de salvar." : "Cada critério começa com nota 5. Ao salvar, você confirma as notas deste atleta."}
              {record.evaluationSource === "WEIGHTED" && " Este registro mantém os pesos originais."}</p>
            {!!profile.length && <div className="review-qualitative"><div className="review-ratings">{profile.map(({ name }) =>
              <ReviewNumber key={name} name={name} label={`Nota: ${name}`} rating step={step} value={draft.ratings[name]}
                onChange={value => patch({ ratings: { ...draft.ratings, [name]: value }, dirty: true })} />)}</div>
              <div className="review-score" aria-live="polite">Média qualitativa<strong>{scoreLabel(score)}</strong></div></div>}
          </section>}
          <section className="review-measures"><h4>Medidas quantitativas</h4>
            <p className="form-hint">{quantitative.length ? "Registre apenas o que observou. As contagens ficam fora da média qualitativa." : "Nenhuma medida configurada neste perfil."}</p>
            <div className="review-counts">{countCards("measures")}</div></section>
          {[[keeper, "Estatísticas do goleiro (opcionais)"], [sports, role === "OUTFIELD" ? "Estatísticas de linha" : "Estatísticas esportivas"]].map(([cards, title]) => cards.length > 0 &&
            <details key={athlete.id + title} className="review-extra"><summary>{title}</summary>
              <p className="form-hint">Em branco significa não informado.{cards === keeper && " Finalizações no alvo correspondem a defesas mais gols sofridos."}</p>
              <div className="review-counts">{cards}</div></details>)}
        </>}
        <div className="review-save-actions">
          <Button type="submit" variant={last ? "primary" : "secondary"}>{saving ? "Salvando…" : "Salvar avaliação"}</Button>
          {!last && <Button type="submit" value="next">Salvar e próximo atleta</Button>}
        </div>
      </fieldset></form>
      {message && <p className={`form-feedback form-feedback--${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.text}</p>}
    </section>
  </div>;
}
