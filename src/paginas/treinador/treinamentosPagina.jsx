import { CalendarPlus, Minus, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Avatar } from "../../componentes/ui/Avatar.jsx";
import { Button } from "../../componentes/ui/Botao.jsx";
import { EmptyState } from "../../componentes/ui/EstadoVazio.jsx";
import { formatDate } from "../../utils/formatters.js";
import { runUiAction } from "../../utils/runUiAction.js";
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
  const criterios = team.objectiveCriteria || [];

  async function adicionarTreino(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      await actions.addTraining({
        team,
        ...form
      });
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

  function mudarMetrica(
    trainingId,
    athleteId,
    metric,
    delta,
    valorAtual
  ) {
    runUiAction(
      () => actions.updateTrainingAthlete({
        trainingId,
        athleteId,
        patch: {
          expectedMetrics: { [metric]: valorAtual },
          metrics: {
            [metric]: Math.max(0, valorAtual + delta)
          }
        }
      }),
      (error) => alert(error.message || "Não foi possível atualizar a métrica.")
    );
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
              <h2>Novo treino</h2>
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
                >
                  <button
                    aria-expanded={treinoAberto === treino.id}
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

                    <span>
                      {treinoAberto === treino.id
                        ? "Fechar"
                        : "Abrir"}
                    </span>
                  </button>

                  {treinoAberto === treino.id && (
                    <div className="training-editor">
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

                      {atletas.map((atleta) => {
                        const dadosAtleta =
                          treino.athletes[atleta.id];

                        if (!dadosAtleta) return null;

                        return (
                          <section
                            className="training-athlete"
                            key={atleta.id}
                          >
                            <div className="training-athlete__head">
                              <Avatar
                                name={atleta.name}
                                photo={atleta.photo}
                              />

                              <div>
                                <strong>{atleta.name}</strong>
                                <span>
                                  Preenchimento por exceção
                                </span>
                              </div>

                              <label className="switch">
                                <input
                                  checked={dadosAtleta.present}
                                  onChange={(event) =>
                                    runUiAction(
                                      () => actions.updateTrainingAthlete({
                                        trainingId: treino.id,
                                        athleteId: atleta.id,
                                        patch: {
                                          present:
                                            event.target.checked
                                        }
                                      }),
                                      (error) => alert(error.message || "Não foi possível atualizar a presença.")
                                    )
                                  }
                                  type="checkbox"
                                />

                                <span>
                                  {dadosAtleta.present
                                    ? "Presente"
                                    : "Ausente"}
                                </span>
                              </label>
                            </div>

                            <div className="metric-grid">
                              {criterios.map((metric) => (
                                <div
                                  className="metric-stepper"
                                  key={metric}
                                >
                                  <span>{metric}</span>

                                  <div>
                                    <button
                                      aria-label={`Diminuir ${metric}`}
                                      onClick={() =>
                                        mudarMetrica(
                                          treino.id,
                                          atleta.id,
                                          metric,
                                          -1,
                                          dadosAtleta.metrics[
                                            metric
                                          ] || 0
                                        )
                                      }
                                      type="button"
                                    >
                                      <Minus size={16} />
                                    </button>

                                    <strong>
                                      {dadosAtleta.metrics[
                                        metric
                                      ] || 0}
                                    </strong>

                                    <button
                                      aria-label={`Aumentar ${metric}`}
                                      onClick={() =>
                                        mudarMetrica(
                                          treino.id,
                                          atleta.id,
                                          metric,
                                          1,
                                          dadosAtleta.metrics[
                                            metric
                                          ] || 0
                                        )
                                      }
                                      type="button"
                                    >
                                      <Plus size={16} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="rating-grid">
                              {Object.entries(
                                dadosAtleta.ratings
                              ).map(([label, value]) => (
                                <label key={label}>
                                  <span>
                                    {label}
                                    <strong>{value}</strong>
                                  </span>

                                  <input
                                    max="10"
                                    min="0"
                                    onChange={(event) =>
                                      runUiAction(
                                        () => actions.updateTrainingAthlete({
                                          trainingId: treino.id,
                                          athleteId: atleta.id,
                                          patch: {
                                            ratings: {
                                              [label]: Number(
                                                event.target.value
                                              )
                                            }
                                          }
                                        }),
                                        (error) => alert(error.message || "Não foi possível atualizar a avaliação.")
                                      )
                                    }
                                    type="range"
                                    value={value}
                                  />
                                </label>
                              ))}
                            </div>
                          </section>
                        );
                      })}
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
