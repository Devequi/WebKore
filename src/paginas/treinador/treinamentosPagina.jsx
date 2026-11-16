import { TrainingReview } from "../../componentes/ui/RevisaoTreino.jsx";
import { CalendarPlus, ChevronDown, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "../../componentes/ui/Botao.jsx";
import { EmptyState } from "../../componentes/ui/EstadoVazio.jsx";
import { formatDate } from "../../utils/formatters.js";
import { isPanelSurfaceClick } from "../../utils/panelInteraction.js";
import { todayDateOnly } from "../../../shared/birthDate.js";
import {
  getApprovedAthletes,
  getTeamTrainings
} from "../../utils/selectors.js";
import "../../styles/paginasTreinador/treinamentosPagina.css";

export function TrainingsPage({ actions, state, team }) {
  const formularioRef = useRef(null);
  const dataRef = useRef(null);
  const [form, setForm] = useState({
    date: todayDateOnly(),
    type: "Misto",
    description: ""
  });
  const [drafts, setDrafts] = useState({});
  const [treinoAberto, setTreinoAberto] = useState(null);
  const [aba, setAba] = useState("add");
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  function abrirFormulario() {
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
      if (created?.id) { setTreinoAberto(created.id); setAba("history"); }
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
    setTreinoAberto(
      treinoAberto === trainingId ? null : trainingId
    );
  }

  async function deletarTreino(trainingId) {
    if (confirm("Tem certeza que quer deletar este treino?")) {
      try {
        await actions.deleteTraining({
          trainingId
        });
      } catch (error) {
        alert(error.message || "Nao foi possivel deletar o treino.");
      }
    }
  }


  return (
    <div className="page-stack">
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
          onClick={() => setAba("history")}
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
              <h2>Histórico de treinos</h2>
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
              {treinos.map((treino) => (
                <article
                  className="training-card"
                  key={treino.id}
                  onClick={(event) => { if (isPanelSurfaceClick(event)) abrirFechar(treino.id); }}
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
