import { ChevronDown, History, Save, Trash2, UserRoundCheck } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useTodayDate } from "../../hooks/useTodayDate.js";
import { formatAge } from "../../../shared/birthDate.js";
import { AthleteDashboard } from "../../componentes/charts/DashboardAtleta.jsx";
import { Avatar } from "../../componentes/ui/Avatar.jsx";
import { Button } from "../../componentes/ui/Botao.jsx";
import { KpiCard } from "../../componentes/ui/CartaoKpi.jsx";
import { EmptyState } from "../../componentes/ui/EstadoVazio.jsx";
import { formatDate, percent } from "../../utils/formatters.js";
import { runUiAction } from "../../utils/runUiAction.js";
import "../../styles/paginasTreinador/AtletasTreinador.css";

import {
  getApprovedAthletes,
  getAthleteEvolution,
  getAthleteStats,
  getAthleteTrainings,
  getRecordAverage
} from "../../utils/selectors.js";

export function AthletesPage({
  actions,
  onSelectAthlete,
  selectedAthleteId,
  state,
  team
}) {
  const today = useTodayDate();
  const atletas = team ? getApprovedAthletes(state, team.id) : [];

  const atletaSelecionado =
    atletas.find(
      (atleta) => atleta.id === selectedAthleteId
    ) || atletas[0];

  const stats = atletaSelecionado
    ? getAthleteStats(
        state,
        team.id,
        atletaSelecionado.id
      )
    : null;

  const evolucao = atletaSelecionado
    ? getAthleteEvolution(
        state,
        team.id,
        atletaSelecionado.id
      )
    : [];

  const treinos = atletaSelecionado
    ? getAthleteTrainings(
        state,
        team.id,
        atletaSelecionado.id
      )
    : [];

  const [editando, setEditando] = useState({
    number: atletaSelecionado?.number ?? "",
    position: atletaSelecionado?.position ?? ""
  });
  const [feedback, setFeedback] = useState(null);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const historicoId = useId();

  useEffect(() => {
    if (atletaSelecionado) {
      setEditando({
        number: atletaSelecionado.number ?? "",
        position: atletaSelecionado.position ?? ""
      });
    }
  }, [atletaSelecionado?.id, atletaSelecionado?.number, atletaSelecionado?.position]);

  if (!team) {
    return (
      <div className="page-stack">
        <EmptyState title="Nenhuma equipe selecionada" text="Selecione uma equipe para visualizar os atletas." />
      </div>
    );
  }

  if (!atletaSelecionado) {
    return (
      <EmptyState title="Nenhum atleta aprovado" text="Os atletas aprovados para esta equipe aparecerão aqui." />
    );
  }

  return (
    <div className="dashboard-grid athletes-layout">
      <section className="panel roster-panel">
        <div className="section-heading">
          <div>
            <h2>Elenco</h2>
          </div>
        </div>

        <div className="athlete-list">
          {atletas.map((atleta) => {
            const statsAtleta = getAthleteStats(
              state,
              team.id,
              atleta.id
            );

            return (
              <button
                className={
                  atleta.id === atletaSelecionado.id
                    ? "athlete-card athlete-card--active"
                    : "athlete-card"
                }
                key={atleta.id}
                onClick={() =>
                  onSelectAthlete(atleta.id)
                }
                type="button"
              >
                <Avatar
                  name={atleta.name}
                  photo={atleta.photo}
                />

                <div className="athlete-card__identity">
                  <strong>{atleta.name}</strong>

                  <span>
                    {[atleta.number != null ? `#${atleta.number}` : null, atleta.position, formatAge(atleta.birthDate, today)].filter(Boolean).join(" · ")}
                  </span>
                </div>

                <small>
                  {percent(statsAtleta.presenceAverage)}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="page-stack">
        <section className="panel athlete-profile-panel">
          <div className="athlete-profile-header">
            <Avatar
              name={atletaSelecionado.name}
              photo={atletaSelecionado.photo}
              size="lg"
            />

            <div>
              <span className="eyebrow">
                Perfil do atleta
              </span>

              <h2>{atletaSelecionado.name}</h2>

              <p>{atletaSelecionado.position || "Atleta da equipe"}</p>
              <p>{formatAge(atletaSelecionado.birthDate, today)}</p>
            </div>
          </div>

          <div className="kpi-grid kpi-grid--compact">
            <KpiCard
              icon={UserRoundCheck}
              label="Presença"
              value={percent(stats.presenceAverage)}
            />

            <KpiCard
              icon={UserRoundCheck}
              label="Treinos"
              value={stats.trainingsCount}
            />

            <div className="kpi-card-largo">
              <KpiCard
                icon={UserRoundCheck}
                label="Desempenho"
                value={percent(stats.averageScore * 10)}
              />
            </div>
          </div>

          <div className="inline-form">
            <label>
              Número

              <input
                onChange={(event) =>
                  setEditando((current) => ({
                    ...current,
                    number: event.target.value
                  }))
                }
                value={editando.number}
              />
            </label>

            <label>
              Posição

              <input
                onChange={(event) =>
                  setEditando((current) => ({
                    ...current,
                    position: event.target.value
                  }))
                }
                value={editando.position}
              />
            </label>

            <Button
              icon={Save}
              onClick={() =>
                runUiAction(
                  () => actions.updateAthlete({
                    athleteId: atletaSelecionado.id,
                    teamId: team.id,
                    patch: editando
                  }),
                  (error) => setFeedback({ type: "error", text: error.message || "Não foi possível atualizar o atleta." }),
                  () => setFeedback({ type: "success", text: "Atleta atualizado." })
                )
              }
              type="button"
            >
              Salvar
            </Button>

            <Button
              icon={Trash2}
              onClick={() =>
                runUiAction(
                  () => actions.removeAthlete({
                    athleteId: atletaSelecionado.id,
                    teamId: team.id
                  }),
                  (error) => setFeedback({ type: "error", text: error.message || "Não foi possível remover o atleta." }),
                  () => setFeedback({ type: "success", text: "Atleta removido da equipe." })
                )
              }
              type="button"
              variant="danger"
            >
              Remover
            </Button>
          </div>
          {feedback && (
            <p className={`form-feedback form-feedback--${feedback.type}`} role="status">
              {feedback.text}
            </p>
          )}
        </section>

        <AthleteDashboard
          data={evolucao}
          stats={stats}
          athleteId={atletaSelecionado.id}
        />

        <details
          className="panel athlete-dashboard athlete-history"
          open={historicoAberto}
          onToggle={(event) => setHistoricoAberto(event.currentTarget.open)}
        >
          <summary className="athlete-dashboard__toggle" aria-expanded={historicoAberto} aria-controls={historicoId}>
            <h2 className="athlete-history__title"><History size={20} aria-hidden="true" /><span>Histórico Completo do Atleta</span></h2>
            <ChevronDown size={20} aria-hidden="true" />
          </summary>

          <div className="athlete-dashboard__content timeline" id={historicoId}>
            {treinos.map((treino) => {
              const dadosAtleta =
                treino.athletes[atletaSelecionado.id];

              return (
                <article key={treino.id}>
                  <strong>
                    {formatDate(treino.date)}
                  </strong>

                  <span>{treino.type}</span>

                  <p>{treino.description}</p>

                  <small>
                    {dadosAtleta.present
                      ? "Presente"
                      : "Ausente"}{" "}
                    · média{" "}
                    {Math.round(
                      getRecordAverage(dadosAtleta) * 10
                    )}
                    %
                  </small>
                </article>
              );
            })}
          </div>
        </details>
      </section>
    </div>
  );
}
