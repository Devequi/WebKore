import { Activity, CalendarDays, Trophy } from "lucide-react";
import { EvolutionChart } from "../../componentes/charts/GraficoEvolucao.jsx";
import { KpiCard } from "../../componentes/ui/CartaoKpi.jsx";
import { EmptyState } from "../../componentes/ui/EstadoVazio.jsx";
import { formatDate, percent } from "../../utils/formatters.js";
import { getAthleteEvolution, getAthleteStats, getAthleteTrainings } from "../../utils/selectors.js";

export function AthleteDashboard({ athleteId, state, team }) {
  if (!team) {
    return (
      <div className="page-stack">
        <EmptyState title="Nenhuma equipe selecionada" text="Selecione uma equipe para visualizar seus dados." />
      </div>
    );
  }
  const stats = getAthleteStats(state, team.id, athleteId);
  const evolution = getAthleteEvolution(state, team.id, athleteId);
  const trainings = getAthleteTrainings(state, team.id, athleteId);

  return (
    <div className="page-stack">
      <section className="kpi-grid">
        <KpiCard icon={Activity} label="Presença" value={percent(stats.presenceAverage)} detail="Na equipe atual" />
        <KpiCard icon={CalendarDays} label="Treinos" value={stats.trainingsCount} detail="Com histórico individual" />
        <KpiCard icon={Trophy} label="Média geral" value={percent(stats.averageScore * 10)} detail="Notas qualitativas" />
      </section>

      <div className="dashboard-grid">
        <EvolutionChart data={evolution} title="Minha evolução" />
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Histórico</span>
              <h2>Treinos recentes</h2>
            </div>
          </div>
          <div className="timeline">
            {trainings.length === 0 && (
              <p className="empty-content">Seus treinos aparecerão aqui depois que forem registrados.</p>
            )}
            {trainings.map((training) => {
              const record = training.athletes[athleteId];
              return (
                <article key={training.id}>
                  <strong>{formatDate(training.date)}</strong>
                  <span>{training.type}</span>
                  <p>{training.description}</p>
                  <small>{record.present ? "Presente" : "Ausente"}</small>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
