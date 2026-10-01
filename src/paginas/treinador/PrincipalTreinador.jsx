import { Activity, CalendarDays, Star, Users } from "lucide-react";
import { TeamEvolutionChart } from "../../componentes/charts/GraficoEvolucaoEquipe.jsx";
import { KpiCard } from "../../componentes/ui/CartaoKpi.jsx";
import { EmptyState } from "../../componentes/ui/EstadoVazio.jsx";
import { formatDate, percent } from "../../utils/formatters.js";
import { getTeamEvolution, getTeamStats } from "../../utils/selectors.js";
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

  return (
    <div className="page-stack">
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
          value={stats.bestAthlete?.name || "-"}
          detail="Maior média geral"
        />
      </section>

      <div className="dashboard-grid">
        <TeamEvolutionChart
          data={evolucao}
          title="Evolução média da equipe"
        />

        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Último treino</span>

              <h2>
                {stats.lastTraining
                  ? formatDate(stats.lastTraining.date)
                  : "Sem treino"}
              </h2>
            </div>
          </div>

          {stats.lastTraining ? (
            <div className="last-training">
              <strong>{stats.lastTraining.type}</strong>

              <p>{stats.lastTraining.description}</p>

              <dl>
                <div>
                  <dt>Participantes</dt>

                  <dd>
                    {
                      Object.values(
                        stats.lastTraining.athletes
                      ).filter((registro) => registro.present).length
                    }{" "}
                    de{" "}
                    {
                      Object.values(
                        stats.lastTraining.athletes
                      ).length
                    }
                  </dd>
                </div>

                <div>
                  <dt>Média técnica</dt>

                  <dd>
                    {Math.round(stats.averageScore * 10)}%
                  </dd>
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
