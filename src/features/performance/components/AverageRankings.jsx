import { useId, useState } from "react";
import { ChevronDown, Footprints, Shield, Trophy, Users } from "lucide-react";
import { getAthleteRanking } from "../model/athleteHighlights.js";

const TOP_COUNT = 3;
const futsalGroups = [
  { id: "OUTFIELD", title: "Jogadores de linha", icon: Footprints },
  { id: "GOALKEEPER", title: "Goleiros", icon: Shield }
];

function RankingCategory({ title, icon: Icon, athletes, latest, expanded }) {
  const titleId = useId();
  const shown = expanded ? athletes : athletes.slice(0, TOP_COUNT);

  return <article aria-labelledby={titleId}>
    <h3 id={titleId}><Icon size={18} aria-hidden="true" />{title}</h3>
    {shown.length ? <ol className="team-home__ranking-list" role="list">
      {shown.map((athlete, index) => <li key={athlete.id}>
        <span className="team-home__ranking-position">{index + 1}º</span>
        <span className="team-home__ranking-athlete">{athlete.name}</span>
        <strong aria-label={`Média: ${athlete.score.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de 10`}>
          {athlete.score.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </strong>
      </li>)}
    </ol> : <p className="empty-content">{latest ? "Nenhuma avaliação válida no último treino." : "Ainda não há avaliações suficientes."}</p>}
  </article>;
}

export function AverageRankings({ rankings, lastRankings, athletes, trainings }) {
  const [period, setPeriod] = useState("history");
  const [expanded, setExpanded] = useState(false);
  const titleId = useId();
  const gridId = useId();
  const latest = period === "latest";
  const grouped = rankings !== null;
  const groups = grouped ? futsalGroups.map((group) => ({ ...group, athletes: (latest ? lastRankings : rankings)?.[group.id] ?? [] }))
    : [{ id: "team", title: "Atletas da equipe", icon: Users,
      athletes: getAthleteRanking(athletes, latest ? trainings.slice(0, 1) : trainings)
        .map((athlete) => ({ ...athlete, roleLabel: athlete.position })) }];

  return <section className="panel best-athlete-panel" aria-labelledby={titleId}>
    <div className="team-home__ranking-heading">
      <h2 id={titleId}><Trophy size={21} aria-hidden="true" />Ranking de atletas</h2>
      <label>Período do ranking
        <select value={period} onChange={(event) => { setPeriod(event.target.value); setExpanded(false); }}>
          <option value="history">Histórico completo</option>
          <option value="latest" disabled={!trainings.length}>Último treino</option>
        </select>
      </label>
    </div>
    <div id={gridId} className={`team-home__ranking-grid${grouped ? " team-home__ranking-grid--split" : ""}`}>
      {groups.map(({ id, ...group }) => <RankingCategory key={id} {...group} latest={latest} expanded={expanded} />)}
    </div>
    {groups.some((group) => group.athletes.length > TOP_COUNT) && <button type="button" className="team-home__ranking-toggle"
      aria-expanded={expanded} aria-controls={gridId} onClick={() => setExpanded((current) => !current)}>
      {expanded ? "Recolher ranking" : "Ver ranking completo"} <ChevronDown size={16} aria-hidden="true" />
    </button>}
  </section>;
}
