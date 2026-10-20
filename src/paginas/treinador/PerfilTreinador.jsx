import { Avatar } from "../../componentes/ui/Avatar.jsx";
import { coachOverview } from "../../utils/teamPerformance.js";

export function CoachProfileOverview({ currentUser, state }) {
  const overview = coachOverview(state, currentUser.id);
  return <>
    <section className="panel">
      <div className="athlete-profile-header"><Avatar name={currentUser.name} photo={currentUser.photo} size="lg" />
        <div><span className="eyebrow">Treinador</span><h2>{currentUser.name}</h2><p>Perfil do treinador</p></div>
      </div>
      <dl className="athlete-facts">
        <div><dt>Nome completo</dt><dd>{currentUser.name}</dd></div>
        <div><dt>E-mail</dt><dd>{currentUser.email || "Não informado"}</dd></div>
        <div><dt>Identificação</dt><dd>{currentUser.id}</dd></div>
        <div><dt>Função</dt><dd>Treinador</dd></div>
      </dl>
    </section>
    <section className="panel">
      <div className="section-heading"><div><span className="eyebrow">Atuação</span><h2>Resumo profissional</h2></div></div>
      <dl className="athlete-facts">
        <div><dt>Equipes administradas</dt><dd>{overview.teams.length}</dd></div>
        <div><dt>Atletas vinculados</dt><dd>{overview.athletesCount}<small>Atletas únicos com vínculo aprovado</small></dd></div>
        <div><dt>Treinos registrados</dt><dd>{overview.trainingsCount}</dd></div>
        <div><dt>Modalidades</dt><dd>{overview.modalities.join(" · ") || "Nenhuma modalidade"}</dd></div>
      </dl>
      {overview.teams.length ? <div className="linked-teams coach-profile-teams">{overview.teams.map((team) => <article className="linked-team" key={team.id}>
        <div><strong>{team.name}</strong><span>{team.modality}</span></div>
      </article>)}</div> : <p className="empty-content">Suas equipes e os dados de atuação aparecerão após criar uma equipe.</p>}
    </section>
  </>;
}
