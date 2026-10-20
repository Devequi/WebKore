import { Check, X } from "lucide-react";
import { useState } from "react";
import { Avatar } from "../../componentes/ui/Avatar.jsx";
import { Button } from "../../componentes/ui/Botao.jsx";
import { EmptyState } from "../../componentes/ui/EstadoVazio.jsx";
import { getPendingAthletes } from "../../utils/selectors.js";
import { runUiAction } from "../../utils/runUiAction.js";
import "../../styles/paginasTreinador/SolicitacoesTreinador.css";

export function RequestsPage({ actions, state, team }) {
  const [feedback, setFeedback] = useState(null);

  function responder(athleteId, status) {
    setFeedback(null);
    runUiAction(
      () => actions.respondRequest({ athleteId, teamId: team.id, status }),
      (error) => setFeedback({ type: "error", text: error.message || "Não foi possível responder à solicitação." }),
      () => setFeedback({ type: "success", text: status === "approved" ? "Solicitação aprovada." : "Solicitação recusada." })
    );
  }

  if (!team) {
    return (
      <section className="panel requests-panel">
        <div className="section-heading">
          <div>
            <h2>Solicitações pendentes</h2>
          </div>
        </div>

        <p className="empty-content">Selecione uma equipe para visualizar solicitações.</p>
      </section>
    );
  }

  const atletasPendentes = getPendingAthletes(state, team.id);

  return (
    <section className="panel requests-panel">
      <div className="section-heading">
        <div>
          <h2>Solicitações pendentes</h2>
        </div>
      </div>

      {feedback && (
        <p className={`form-feedback form-feedback--${feedback.type}`} role="status">
          {feedback.text}
        </p>
      )}

      {atletasPendentes.length === 0 ? (
        <EmptyState
          title="Nenhuma solicitação"
          text="Novos pedidos de entrada aparecem aqui para aprovação."
        />
      ) : (
        <div className="request-list">
          {atletasPendentes.map((atleta) => (
            <article
              className="request-card"
              key={atleta.id}
            >
              <Avatar
                name={atleta.name}
                photo={atleta.photo}
              />

              <div>
                <strong>{atleta.name}</strong>
                <span>Solicitação de entrada</span>
              </div>

              <div className="request-card__actions">
                <Button
                  className="request-card__accept"
                  icon={Check}
                  onClick={() => responder(atleta.id, "approved")}
                  type="button"
                >
                  Aceitar
                </Button>

                <Button
                  icon={X}
                  onClick={() => responder(atleta.id, "rejected")}
                  type="button"
                  variant="danger"
                >
                  Recusar
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
