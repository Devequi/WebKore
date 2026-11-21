import { useState } from "react";
import { EvolutionChart } from "./EvolutionChart.jsx";

export function TeamEvolutionChart({ views }) {
  const [scope, setScope] = useState("overall");
  const view = views.find((item) => item.id === scope) || views[0];
  const viewControl = views.length > 1 && <div className="team-home__views" role="group" aria-label="Função na evolução">
    {views.map((item) => <button key={item.id} type="button" aria-pressed={item.id === view.id}
      onClick={() => setScope(item.id)}>{item.label}</button>)}
  </div>;
  return <EvolutionChart data={view.performance.observations} criteria={view.criteria}
    title={view.id === "overall" ? "Evolução média da equipe" : `Evolução — ${view.label}`}
    dashboard scope={view.id} viewControl={viewControl} />;
}
