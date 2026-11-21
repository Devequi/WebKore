import { TrainingReview } from "./TrainingReview.jsx";
import { CalendarPlus, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "../../components/ui/Button.jsx";
import { useConfirmation } from "../../components/ui/ConfirmDialog.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { formatDate } from "../../utils/formatters.js";
import { todayDateOnly } from "../../../shared/birthDate.js";
import {
  getApprovedAthletes,
  getTeamTrainings
} from "../../app/state/selectors.js";
import "./TrainingsPage.css";

export function TrainingsPage({ actions, state, team, initialTrainingId, createMode = false, onNavigateTraining }) {
  const formularioRef = useRef(null);
  const dataRef = useRef(null);
  const [form, setForm] = useState({
    date: todayDateOnly(),
    type: "Misto",
    description: ""
  });
  const [drafts, setDrafts] = useState({});
  const [localTrainingId, setTreinoAberto] = useState(initialTrainingId || null);
  const [localTab, setAba] = useState(createMode ? "add" : "history");
  const treinoAberto = onNavigateTraining ? initialTrainingId || null : localTrainingId;
  const aba = onNavigateTraining ? createMode ? "add" : "history" : localTab;
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);
  const { confirmAction, confirmation } = useConfirmation();

  function abrirFormulario() {
    if (onNavigateTraining) { onNavigateTraining("new"); return; }
    setAba("add");
    requestAnimationFrame(() => {
      formularioRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start"
      });
      dataRef.current?.focus({ preventScroll: true });
    });
  }

  if (!team) {
    return (
      <div className="page-stack">
        <EmptyState title="Nenhuma equipe selecionada" text="Selecione uma equipe para visualizar os treinos." />
      </div>
    );
  }

  const treinos = getTeamTrainings(state, team.id);
  const atletas = getApprovedAthletes(state, team.id);

  async function adicionarTreino(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const created = await actions.addTraining({
        team,
        ...form
      });
      if (created?.id) { if (onNavigateTraining) onNavigateTraining(created.id, "Treino cadastrado."); else { setTreinoAberto(created.id); setAba("history"); } }
    } catch (error) {
      setFeedback({ type: "error", text: error.message || "Não foi possível cadastrar o treino." });
      setSaving(false);
      return;
    }

    setSaving(false);
    setFeedback({ type: "success", text: "Treino cadastrado." });

    setForm({
      date: todayDateOnly(),
      type: "Misto",
      description: ""
    });
  }

  function abrirFechar(trainingId) {
    if (onNavigateTraining) { onNavigateTraining(treinoAberto === trainingId ? "" : trainingId); return; }
    setTreinoAberto(
      treinoAberto === trainingId ? null : trainingId
    );
  }

  function voltarAoHistorico() {
    if (onNavigateTraining) onNavigateTraining();
    else { setTreinoAberto(null); setAba("history"); }
  }

  async function deletarTreino(trainingId) {
    if (!await confirmAction({ title: "Excluir treino?", label: "Excluir treino",
      description: "O treino e seus registros serão removidos." })) return;
    try {
      await actions.deleteTraining({ trainingId });
      setFeedback({ type: "success", text: "Treino excluído." });
      if (onNavigateTraining) onNavigateTraining("", "Treino excluído.");
    } catch (error) {
      setFeedback({ type: "error", text: error.message || "Não foi possível excluir o treino." });
    }
  }


  return (
    <div className="page-stack">
      {confirmation}
      {initialTrainingId && <Button variant="ghost" onClick={voltarAoHistorico}>Voltar aos treinos</Button>}
      {initialTrainingId && <p role="status">Detalhes e avaliação do treino</p>}
      {aba === "history" && feedback && <p className={`form-feedback form-feedback--${feedback.type}`}
        role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p>}
      <div aria-label="Visualização dos treinos" className="tabs-header" role="tablist">
        <button
          aria-controls="training-add-panel"
          aria-selected={aba === "add"}
          className={`tab-button ${aba === "add" ? "active" : ""}`}
          onClick={abrirFormulario}
          role="tab"
          type="button"
        >
          Cadastrar treino
        </button>

        <button
          aria-controls="training-history-panel"
          aria-selected={aba === "history"}
          className={`tab-button ${aba === "history" ? "active" : ""}`}
          onClick={voltarAoHistorico}
          role="tab"
          type="button"
        >
          Histórico ({treinos.length})
        </button>
      </div>

      {aba === "add" && (
        <section className="panel training-create-panel" id="training-add-panel" ref={formularioRef} role="tabpanel">
          <div className="section-heading">
            <div>
              <h2>Informações do treino</h2>
              <p className="form-hint">Equipe: {team.name}. Após cadastrar, revise a presença e as notas dos participantes no histórico.</p>
            </div>
          </div>

          <form
            className="training-form"
            onSubmit={adicionarTreino}
          >
            <label>
              Data

              <input
                ref={dataRef}
                required
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    date: event.target.value
                  }))
                }
                type="date"
                value={form.date}
              />
            </label>

            <label>
              Tipo

              <select
                required
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value
                  }))
                }
                value={form.type}
              >
                <option>Físico</option>
                <option>Coletivo</option>
                <option>Misto</option>
                <option>Partida</option>
              </select>
            </label>

            <label>
              Descrição

              <textarea
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value
                  }))
                }
                placeholder="Objetivos, exercícios ou observações"
                value={form.description}
              />
            </label>

            <Button
              disabled={!atletas.length || saving}
              icon={CalendarPlus}
              type="submit"
            >
              {saving ? "Cadastrando..." : "Cadastrar treino"}
            </Button>
            {!atletas.length && (
              <p className="form-hint">A equipe precisa ter atletas aprovados para cadastrar um treino.</p>
            )}
            {feedback && (
              <p className={`form-feedback form-feedback--${feedback.type}`} role="status">
                {feedback.text}
              </p>
            )}
          </form>
        </section>
      )}

      {aba === "history" && (
        <section className="panel training-history" id="training-history-panel" role="tabpanel">
          <div className="section-heading">
            <div>
              <h2>{initialTrainingId ? "Detalhes do treino" : "Histórico de treinos"}</h2>
            </div>
            <Button icon={CalendarPlus} onClick={abrirFormulario} type="button">
              Cadastrar treino
            </Button>
          </div>

          {treinos.length === 0 ? (
            <EmptyState
              title="Sem treinos"
              text="Cadastre um treino para iniciar o acompanhamento da equipe."
            />
          ) : (
            <div className="accordion-list">
              {treinos.filter((treino) => !initialTrainingId || treino.id === initialTrainingId).map((treino) => (
                <article
                  className="training-card"
                  key={treino.id}
                >
                  <button
                    aria-expanded={treinoAberto === treino.id}
                    aria-controls={`training-editor-${treino.id}`}
                    className="training-card__summary"
                    onClick={() => abrirFechar(treino.id)}
                    type="button"
                  >
                    <div>
                      <strong>
                        {formatDate(treino.date)}
                      </strong>

                      <span>
                        {treino.type} ·{" "}
                        {treino.description || "Sem descrição"}
                      </span>
                    </div>

                    <ChevronDown className="training-card__chevron" size={18} aria-hidden="true" />
                  </button>

                  {treinoAberto === treino.id && (
                    <div className="training-editor" id={`training-editor-${treino.id}`}>
                      <div className="training-delete">
                        <Button icon={ChevronUp} variant="ghost" type="button" onClick={() => abrirFechar(treino.id)}>
                          Recolher treino
                        </Button>
                        <Button
                          icon={Trash2}
                          variant="ghost"
                          onClick={() =>
                            deletarTreino(treino.id)
                          }
                          type="button"
                        >
                          Deletar treino
                        </Button>
                      </div>

                      <TrainingReview training={treino} athletes={atletas} team={team} actions={actions}
                        drafts={drafts[treino.id] || {}} setDrafts={(update) => setDrafts((old) => ({ ...old, [treino.id]: update(old[treino.id] || {}) }))} />
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
