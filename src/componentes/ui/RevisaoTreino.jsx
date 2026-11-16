import { useState } from "react";
import { Button } from "./Botao.jsx";
import { PositionEvaluationEditor } from "./AvaliacaoPosicao.jsx";
import { evaluationRole, validateMeasurements } from "../../../shared/evaluations.js";
import { evaluationDraft, evaluationProfile, measurementProfile, draftScore } from "../../utils/evaluationDraft.js";
import { scoreLabel } from "../../utils/athletePerformance.js";
import { formatDate } from "../../utils/formatters.js";
import "../../styles/TrainingReview.css";

export function TrainingReview({ training, athletes, team, actions, drafts, setDrafts }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const participants = athletes.filter((athlete) => training.athletes[athlete.id]);
  const rows = participants.map((athlete) => {
    const record = training.athletes[athlete.id];
    const profile = evaluationProfile(record, team, athlete);
    const quantitative = measurementProfile(record, team, athlete);
    const draft = drafts[athlete.id] || evaluationDraft(record, profile, quantitative);
    let measurementError = null;
    try { validateMeasurements(quantitative, draft.measurements || {}); } catch(error) { measurementError = error.message; }
    const score = draftScore(record, profile, draft.ratings);
    const saved = Boolean(record.evaluationSource || Object.keys(record.ratings || {}).length);
    return { athlete, record, profile, quantitative, draft, score, saved, measurementError };
  });
  const current = rows.find((row) => row.athlete.id === selected) || rows[0];
  const status = (row) => !row.draft.present ? "Ausente" : row.draft.confirmed ? "Revisada para salvar" : row.saved && !row.draft.dirty ? "Avaliação salva" : "Pendente de revisão";
  const pending = rows.filter((row) => row.draft.present && !(row.draft.confirmed || row.saved && !row.draft.dirty)).length;
  const reviewed = rows.filter((row) => row.draft.present && (row.draft.confirmed || row.saved && !row.draft.dirty));
  function patch(id, changes) {
    setMessage(null);
    const row = rows.find((item) => item.athlete.id === id);
    setDrafts((old) => ({ ...old, [id]: { ...row.draft, ...changes } }));
  }
  async function save() {
    setSaving(true); setMessage(null);
    let count = 0;
    try {
      for (const row of rows) {
        const ratingsChanged = row.draft.present && row.draft.confirmed && (!row.saved || row.draft.dirty);
        const measurementsChanged = row.draft.present && row.draft.measurementsDirty;
        if (measurementsChanged && row.measurementError) throw new Error(row.measurementError);
        if (!ratingsChanged && !measurementsChanged && row.draft.present === row.record.present) continue;
        await actions.updateTrainingAthlete({ trainingId: training.id, athleteId: row.athlete.id,
          patch: { present: row.draft.present, ...(ratingsChanged ? { ratings: row.draft.ratings } : {}), ...(measurementsChanged ? { measurements: row.draft.measurements } : {}) } });
        // Clear only changes confirmed by the API. Other participants keep their drafts.
        setDrafts((old) => ({ ...old, [row.athlete.id]: { ...row.draft, confirmed: ratingsChanged ? false : row.draft.confirmed, dirty: ratingsChanged ? false : row.draft.dirty, measurementsDirty: measurementsChanged ? false : row.draft.measurementsDirty } }));
        count++;
      }
      setMessage({ type: "success", text: `Registro salvo. ${pending ? `${pending} avaliação(ões) continuam pendentes e não foram registradas.` : "Avaliações confirmadas salvas."}` });
    } catch (error) { setMessage({ type: "error", text: `${error.message} ${count ? `${count} registro(s) já foram salvos; os demais permanecem disponíveis para tentar novamente.` : "Suas alterações foram mantidas."}` }); }
    finally { setSaving(false); }
  }
  if (!current) return <p className="empty-content">Nenhum participante disponível.</p>;
  return <div className="training-review">
    <section className="review-information" aria-label="Informações do treino">
      <h3>1. Informações do treino</h3><dl className="review-facts">
        <div><dt>Data</dt><dd>{formatDate(training.date)}</dd></div><div><dt>Tipo</dt><dd>{training.type}</dd></div>
        <div><dt>Equipe</dt><dd>{team.name}</dd></div><div><dt>Descrição</dt><dd>{training.description || "Sem descrição"}</dd></div>
      </dl>
    </section>
    <div className="review-workspace">
      <section className="review-participants" aria-label="Participantes"><h3>2. Participantes</h3>
        <p className="form-hint">Selecione um atleta para revisar as notas.</p>
        <div className="review-participant-list">{rows.map((row) => <button type="button" key={row.athlete.id} disabled={saving}
          className="review-participant" aria-pressed={current.athlete.id === row.athlete.id} onClick={() => setSelected(row.athlete.id)}>
          <strong>{row.athlete.name}</strong><span>{row.record.position || row.athlete.position || "Posição não informada"}</span><small>{status(row)}</small>
        </button>)}</div>
      </section>
      <section className="review-individual" aria-label="Avaliação individual"><h3>3. Avaliação individual</h3>
        <h4>{current.athlete.name}</h4><p className="form-hint">{current.record.position || current.athlete.position || "Posição não informada"}</p>
        <fieldset disabled={saving} className="athlete-profile-fields">
          <label className="review-checkbox"><input type="checkbox" checked={current.draft.present}
            onChange={(event) => patch(current.athlete.id, { present: event.target.checked, confirmed: false })} />Participou do treino</label>
          {!current.draft.present ? <p className="form-hint">Atleta ausente. Nenhuma avaliação nova será registrada. Notas antigas são preservadas.</p> : !current.profile ?
            <p role="status" className="form-feedback">Defina uma posição válida no cadastro do atleta antes de avaliá-lo.</p> : <>
            <h4>Avaliações qualitativas</h4>
            {!current.profile.length && <p className="form-hint">Nenhum critério qualitativo configurado para este perfil.</p>}
            <p className="form-hint">{current.saved ? "Notas previamente salvas. Alterações exigem nova revisão." : "Rascunho inicial: nota 5 em cada critério. Revise e confirme antes de salvar."}
              {current.record.evaluationSource === "WEIGHTED" && " Este registro histórico mantém seu cálculo original."}</p>
            <div className="rating-grid">{current.profile.map(({ name }) => <label key={name}>{name}
              <input aria-label={`Nota: ${name}`} type="number" min="0" max="10" step={!current.record.modality || !current.record.role && !evaluationRole(team.modality, current.athlete.position) || current.record.evaluationSource === "LEGACY" ? "1" : "0.1"}
                value={current.draft.ratings[name] ?? ""} onChange={(event) => patch(current.athlete.id, {
                  ratings: { ...current.draft.ratings, [name]: event.target.value === "" ? undefined : Number(event.target.value) }, dirty: true, confirmed: false })} />
            </label>)}</div>
            <p className="review-score" aria-live="polite">Média qualitativa: <strong>{scoreLabel(current.score)}</strong></p>
            {current.profile.length > 0 && <label className="review-checkbox"><input type="checkbox" checked={current.draft.confirmed} disabled={current.score === null}
              onChange={(event) => patch(current.athlete.id, { confirmed: event.target.checked })} />Revisei e confirmo estas notas</label>}
          </>}
        </fieldset>
        {current.draft.present && <section className="review-measurements" aria-label="Medidas quantitativas">
          <h4>Medidas quantitativas</h4><p className="form-hint">Registre somente o que foi observado. Estas contagens não entram na média qualitativa.</p>
          {!current.quantitative.length && <p className="form-hint">Nenhuma medida configurada neste perfil.</p>}
          <fieldset disabled={saving} className="athlete-profile-fields"><div className="metric-grid">{current.quantitative.map((item) => {
            const id = item.criterionId || item.id;
            return <label key={id}>{item.name}<input type="number" min="0" max="2147483647" step="1" aria-label={`Quantidade: ${item.name}`}
              value={current.draft.measurements?.[id] ?? ""} onChange={(event) => patch(current.athlete.id, {
                measurements: { ...current.draft.measurements, [id]: event.target.value === "" ? null : Number(event.target.value) }, measurementsDirty: true })} /></label>;
          })}</div></fieldset>
          {current.measurementError && <p className="form-feedback form-feedback--error" role="alert">{current.measurementError}</p>}
        </section>}
        {current.draft.present && (current.record.goalkeeperStats || Object.keys(current.record.metrics || {}).length > 0) && <div className="review-statistics">
          <p className="form-hint">Estatísticas anteriores deste registro. As alterações abaixo são salvas separadamente.</p>
          <PositionEvaluationEditor key={current.athlete.id} hideRatings team={team}
            draftStats={current.draft.stats} draftMetrics={current.draft.metrics} onDraftChange={(changes) => patch(current.athlete.id, changes)}
            record={{ ...current.record, position: current.record.position || current.athlete.position,
              role: current.record.role || (current.record.modality && evaluationRole(current.record.modality, current.athlete.position)) || "OUTFIELD" }}
            onSave={(patch) => actions.updateTrainingAthlete({ trainingId: training.id, athleteId: current.athlete.id, patch })} />
        </div>}
      </section>
    </div>
    <section className="review-summary" aria-label="Revisão e salvamento"><h3>4. Revisão e salvamento</h3>
      <p>{reviewed.length} atleta(s) avaliado(s) ou revisado(s) · {pending} pendente(s)</p>
      {reviewed.length > 0 && <ul>{reviewed.map((row) => <li key={row.athlete.id}>{row.athlete.name}: {scoreLabel(row.score)}</li>)}</ul>}
      {pending > 0 && <p className="form-hint">Notas não revisadas ficam pendentes. Somente avaliações confirmadas serão registradas.</p>}
      <Button type="button" disabled={saving || rows.some((row) => row.draft.present && row.draft.measurementsDirty && row.measurementError) || !rows.some((row) => row.draft.present !== row.record.present || row.draft.present && row.draft.measurementsDirty || row.draft.present && row.draft.confirmed && (!row.saved || row.draft.dirty))} onClick={save}>
        {saving ? "Salvando…" : "Salvar presença, notas e medidas"}
      </Button>
      {message && <p className={`form-feedback form-feedback--${message.type}`} role={message.type === "error" ? "alert" : "status"}>{message.text}</p>}
    </section>
  </div>;
}
