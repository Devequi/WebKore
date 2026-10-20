import { Activity, CalendarDays, Star, Users } from "lucide-react";
import { TeamEvolutionChart } from "../../componentes/charts/GraficoEvolucaoEquipe.jsx";
import { KpiCard } from "../../componentes/ui/CartaoKpi.jsx";
import { EmptyState } from "../../componentes/ui/EstadoVazio.jsx";
import { formatDate, percent } from "../../utils/formatters.js";
import { getTeamEvolution, getTeamStats } from "../../utils/selectors.js";
import { getLastTrainingStats } from "../../utils/lastTraining.js";
import "../../styles/paginasTreinador/PrincipalTreinador.css";

export function TeamHome({ state, team }) {
  if (!team) {
    return (
      <div className="page-stack">
        <EmptyState title="Nenhuma equipe selecionada" text="Selecione uma equipe para visualizar os dados." />
      </div>
    );
  }

  const stats = getTeamStats(state, team.id);
  const evolucao = getTeamEvolution(state, team.id);
  const lastTraining = stats.lastTraining;
  const lastStats = getLastTrainingStats(lastTraining);

  return (
    <div className="page-stack team-home">
      <section className="kpi-grid">
        <KpiCard
          icon={Users}
          label="Atletas"
          value={stats.athletesCount}
          detail="Aprovados na equipe"
        />

        <KpiCard
          icon={CalendarDays}
          label="Treinos"
          value={stats.trainingsCount}
          detail="Histórico registrado"
        />

        <KpiCard
          icon={Activity}
          label="Presença média"
          value={percent(stats.presenceAverage)}
          detail="Por treino"
        />

        <KpiCard
          icon={Star}
          label="Destaque"
          value={<span className="team-home__highlight-name" title={stats.bestAthlete?.name}>{stats.bestAthlete?.name || "-"}</span>}
          detail="Maior média geral"
        />
      </section>

      <div className="dashboard-grid">
        <TeamEvolutionChart
          data={evolucao}
          averages={{ desempenho: stats.averageScore, presenca: stats.presenceAverage }}
          title="Evolução média da equipe"
        />

        <section className="panel last-training-panel" aria-label="Último treino">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Último treino</span>

              <h2>
                {lastTraining
                  ? <time dateTime={lastTraining.date}>{formatDate(lastTraining.date)}</time>
                  : "Sem treino"}
              </h2>
            </div>
          </div>

          {lastTraining ? (
            <div className="last-training-panel__body">
              {lastTraining.type && <strong className="last-training-panel__type">{lastTraining.type}</strong>}
              {lastTraining.description?.trim() && <p className="last-training-panel__description">{lastTraining.description}</p>}

              <dl className="last-training-panel__stats">
                <div>
                  <dt>Participantes</dt>

                  <dd className={lastStats.recordCount ? undefined : "last-training-panel__missing"}>
                    {lastStats.recordCount ? `${lastStats.presentCount} de ${lastStats.recordCount}` : "Sem registros"}
                  </dd>
                </div>

                <div>
                  <dt>Presença</dt>
                  <dd>{lastStats.presenceAverage === null ? "—" : percent(lastStats.presenceAverage)}</dd>
                </div>
                <div>
                  <dt title="Média das avaliações qualitativas deste treino">Média técnica</dt>
                  <dd className={lastStats.averageScore === null ? "last-training-panel__missing" : undefined}>{lastStats.averageScore === null ? "Sem avaliações" : `${lastStats.averageScore.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/10`}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="empty-content">Nenhuma atividade cadastrada.</p>
          )}
        </section>
      </div>
    </div>
  );
}
