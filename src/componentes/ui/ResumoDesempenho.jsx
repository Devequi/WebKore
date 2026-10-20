import { scoreLabel } from "../../utils/athletePerformance.js";
import { CollapsiblePanel } from "./PainelRetratil.jsx";

export function PerformanceSummary({ performance, collective = false }) {
  const { best, improvement, averageScore, evaluationCount, hasComparableEvaluations } = performance;
  const indicators = [
    { label: "Média geral", value: scoreLabel(averageScore), detail: collective ? "Média por registro individual avaliado" : "Média por treino avaliado" },
    { label: collective ? "Avaliações registradas" : "Avaliações recebidas", value: evaluationCount, detail: collective ? "Registros individuais com notas válidas" : "Treinos com ao menos uma nota válida" },
    { label: "Melhor critério", value: best?.name || "Dados insuficientes", detail: best ? `${scoreLabel(best.average)} de média` : "Aguardando avaliações" },
    { label: "Maior evolução", value: improvement?.name || (hasComparableEvaluations ? "Sem crescimento" : "Dados insuficientes"),
      detail: improvement ? `+${improvement.change.toLocaleString("pt-BR")} pontos` : hasComparableEvaluations ? "Nenhum critério apresentou aumento" : "Requer notas em datas diferentes" }
  ];
  return <CollapsiblePanel title={collective ? "Desempenho da equipe" : "Resumo de desempenho"} eyebrow={collective ? "Resumo coletivo" : "Seu progresso"} className="athlete-performance-panel">
    <dl className="athlete-performance">{indicators.map((item) => <div className="athlete-performance__indicator" key={item.label}>
      <dt>{item.label}</dt><dd className="athlete-performance__value">{item.value}</dd><dd className="athlete-performance__detail">{item.detail}</dd>
    </div>)}</dl>
    <p className="athlete-performance__hint">{collective ? "Histórico da equipe · evolução entre médias do primeiro e último treino avaliado; participantes podem variar." : "Histórico da equipe atual · evolução entre primeira e última nota do mesmo critério."}</p>
  </CollapsiblePanel>;
}
