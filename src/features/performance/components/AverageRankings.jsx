import { useId, useState } from "react";
import { ChevronDown, Footprints, Shield, Trophy, Users } from "lucide-react";
import { scoreLabel } from "../model/athletePerformance.js";
import { getAthleteRanking } from "../model/athleteHighlights.js";

const TOP_COUNT = 3;
const futsalGroups = [
  { id: "OUTFIELD", title: "Jogadores de linha", icon: Footprints },
  { id: "GOALKEEPER", title: "Goleiros", icon: Shield }
];

function RankingCard({ title, icon: Icon, athletes, latest }) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const shown = expanded ? athletes : athletes.slice(0, TOP_COUNT);

  return <article className="team-home__ranking-card">
    <h3><Icon size={18} aria-hidden="true" />{title}</h3>
    {shown.length ? <ol id={listId} className="team-home__ranking-list">
      {shown.map((athlete, index) => <li key={athlete.id}>
        <span className="team-home__ranking-position" aria-hidden="true">{index + 1}º</span>
        <div className="team-home__ranking-athlete">
          <span>{athlete.name}</span>
          {athlete.roleLabel && <small>{athlete.roleLabel}</small>}
          <span className="team-home__ranking-track" aria-hidden="true">
            <span style={{ width: `${athlete.score * 10}%` }} />
          </span>
        </div>
        <strong>{scoreLabel(athlete.score)}</strong>
      </li>)}
    </ol> : <p className="empty-content">{latest ? "Nenhuma avaliação válida no último treino." : "Ainda não há avaliações suficientes."}</p>}
    {athletes.length > TOP_COUNT && <button type="button" className="team-home__ranking-toggle" aria-expanded={expanded}
      aria-label={`${expanded ? "Mostrar menos" : "Ver mais"}: ${title}`} aria-controls={listId}
      onClick={() => setExpanded((current) => !current)}>
      {expanded ? "Mostrar menos" : "Ver mais"} <ChevronDown size={16} aria-hidden="true" />
    </button>}
  </article>;
}

export function AverageRankings({ rankings, lastRankings, athletes, trainings }) {
  const [period, setPeriod] = useState("history");
  const titleId = useId();
  const latest = period === "latest";
  const grouped = rankings !== null;
  const groups = grouped ? futsalGroups.map((group) => ({ ...group, athletes: (latest ? lastRankings : rankings)?.[group.id] ?? [] }))
    : [{ id: "team", title: "Atletas da equipe", icon: Users,
      athletes: getAthleteRanking(athletes, latest ? trainings.slice(0, 1) : trainings)
        .map((athlete) => ({ ...athlete, roleLabel: athlete.position })) }];

  return <section className="panel best-athlete-panel" aria-labelledby={titleId}>
    <div className="team-home__ranking-heading">
      <h2 id={titleId}><Trophy size={21} aria-hidden="true" />{latest ? "Melhores médias do último treino" : "Melhores médias do histórico"}</h2>
      <label>Período do ranking
        <select value={period} onChange={(event) => setPeriod(event.target.value)}>
          <option value="history">Histórico completo</option>
          <option value="latest" disabled={!trainings.length}>Último treino</option>
        </select>
      </label>
    </div>
    <div className={`team-home__ranking-grid${grouped ? " team-home__ranking-grid--split" : ""}`}>
      {groups.map(({ id, ...group }) => <RankingCard key={`${period}:${id}`} {...group} latest={latest} />)}
    </div>
  </section>;
}
