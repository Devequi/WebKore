import { Activity, CalendarDays, Save, Search, Trash2, Trophy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTodayDate } from "../../hooks/useTodayDate.js";
import { formatAge } from "../../../shared/birthDate.js";
import { TrainingHistory } from "../../componentes/charts/HistoricoTreinos.jsx";
import { athletePerformance, scoreLabel } from "../../utils/athletePerformance.js";
import { getTeamCriteria } from "../../../shared/criteria.js";
import { AthleteDashboard } from "../../componentes/charts/DashboardAtleta.jsx";
import { Avatar } from "../../componentes/ui/Avatar.jsx";
import { Button } from "../../componentes/ui/Botao.jsx";
import { KpiCard } from "../../componentes/ui/CartaoKpi.jsx";
import { EmptyState } from "../../componentes/ui/EstadoVazio.jsx";
import { formatDate, percent } from "../../utils/formatters.js";
import { runUiAction } from "../../utils/runUiAction.js";
import { filterAthletesByName } from "../../utils/athleteSearch.js";
import "../../styles/paginasTreinador/AtletasTreinador.css";

import {
  getApprovedAthletes,
  getAthleteStats,
  getAthleteTrainings
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
  const [busca, setBusca] = useState("");
  const buscaRef = useRef(null);
  const mostrarBusca = atletas.length > 5;
  const atletasVisiveis = mostrarBusca ? filterAthletesByName(atletas, busca) : atletas;

  useEffect(() => {
    setBusca("");
  }, [team?.id, mostrarBusca]);

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
  const performance = athletePerformance(treinos, atletaSelecionado?.id);

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
            <p className="roster-count">{atletas.length} {atletas.length === 1 ? "atleta" : "atletas"}</p>
          </div>
        </div>

        {mostrarBusca && <div className="search-input roster-search">
          <Search size={18} aria-hidden="true" />
          <input ref={buscaRef} type="search" aria-label="Buscar atleta pelo nome" placeholder="Buscar atleta pelo nome..."
            value={busca} onChange={(event) => setBusca(event.target.value)} />
          {busca && <button type="button" className="roster-search__clear" aria-label="Limpar pesquisa"
            onClick={() => { setBusca(""); buscaRef.current?.focus(); }}><X size={18} aria-hidden="true" /></button>}
        </div>}

        {atletasVisiveis.length === 0 && <div className="roster-search__empty" role="status">
          <strong>Nenhum atleta encontrado.</strong>
          <p>Tente pesquisar por outro nome.</p>
        </div>}

        <div className="athlete-list">
          {atletasVisiveis.map((atleta) => {
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

          <div className="kpi-grid athlete-kpis">
            <KpiCard
              icon={Activity}
              label="Presença"
              value={percent(stats.presenceAverage)}
            />

            <KpiCard
              icon={CalendarDays}
              label="Treinos"
              value={stats.trainingsCount}
            />

            <div className="kpi-card-largo">
              <KpiCard
                icon={Trophy}
                label="Desempenho"
                value={scoreLabel(performance.averageScore)}
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

        <AthleteDashboard key={team.id + atletaSelecionado.id} performance={performance} criteria={getTeamCriteria(team, "qualitative")} />
        <TrainingHistory key={team.id + atletaSelecionado.id} trainings={treinos} athleteId={atletaSelecionado.id} />
      </section>
    </div>
  );
}
