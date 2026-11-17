import { goalkeeperFields, recordScore } from "../../../shared/evaluations.js";
import { GoalkeeperSummary } from "../ui/AvaliacaoPosicao.jsx";
import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "../ui/Botao.jsx";
import { CollapsiblePanel } from "../ui/PainelRetratil.jsx";
import { formatDate } from "../../utils/formatters.js";
import { ratingEntries, scoreLabel } from "../../utils/athletePerformance.js";

export function TrainingHistory({ trainings, athleteId, recentLimit = 5, showAllLabel = "Ver histórico completo" }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const listId = useId();
  const selected = trainings.find((training) => training.id === selectedId);
  return <CollapsiblePanel title={expanded ? "Histórico completo" : "Treinos recentes"} eyebrow="Histórico individual"
    className="athlete-history-panel" actions={<span className="athlete-note">{trainings.length} registros</span>}>
    {!trainings.length && <p className="empty-content">Seus treinos aparecerão aqui depois que forem registrados pelo treinador.</p>}
    <div className="athlete-training-list" id={listId}>{(expanded ? trainings : trainings.slice(0, recentLimit)).map((training) => {
      const item = training.athletes[athleteId];
      return <button className="athlete-training-row" type="button" key={training.id} onClick={() => setSelectedId(training.id)} aria-haspopup="dialog">
        <div className="athlete-training-heading"><time dateTime={training.date}>{formatDate(training.date)}</time><span className={`athlete-badge ${item.present === false ? "athlete-badge--absent" : ""}`}>{item.present === true ? "Presente" : item.present === false ? "Ausente" : "Presença não informada"}</span></div>
        <strong>{training.title || `Treino ${training.type || "registrado"}`}</strong>
        <p>{training.description || "Sem descrição."}</p><span className="athlete-note">{ratingEntries(item).length ? "Avaliação registrada" : "Sem avaliação"} · Ver detalhes</span>
      </button>;
    })}</div>
    {trainings.length > recentLimit && <Button type="button" variant="ghost" aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded(!expanded)}>{expanded ? "Mostrar apenas recentes" : showAllLabel}</Button>}
    <TrainingDetails selected={selected} athleteId={athleteId} onClose={() => setSelectedId(null)} />
  </CollapsiblePanel>;
}

export function TrainingDetails({ selected, athleteId, onClose }) {
  const dialog = useRef(null);
  const titleId = useId();
  const record = selected?.athletes?.[athleteId];
  useEffect(() => {
    if (selected && !dialog.current.open) dialog.current.showModal();
    else if (!selected) dialog.current.close();
  }, [selected]);

  return <dialog ref={dialog} className="athlete-training-dialog" aria-labelledby={titleId} onClose={onClose}
    onClick={(event) => { if (event.target === event.currentTarget) dialog.current.close(); }}>
      {selected && <div className="page-stack"><div className="section-heading"><div><span className="eyebrow">{formatDate(selected.date)} · {selected.type}</span><h2 id={titleId}>{selected.title || "Detalhes do treino"}</h2></div><button aria-label="Fechar detalhes" type="button" onClick={() => dialog.current.close()}><X size={18} /></button></div>
        <p>{selected.description || "Sem descrição."}</p><p>Presença: {record?.present === true ? "Presente" : record?.present === false ? "Ausente" : "Não informada"}</p>
        <p>{record?.modality || "Modalidade não registrada"} · {record?.position || "Posição não registrada"} · {record?.evaluationSource === "LEGACY" ? "Avaliação legada" : "Avaliação técnica"}</p>
        <p>Nota final: {scoreLabel(recordScore(record))}</p>
        {record?.criteriaSnapshot?.length > 0 && <dl className="athlete-facts">{record.criteriaSnapshot.map((item) => <div key={item.name}><dt>{item.name}</dt><dd>{scoreLabel(item.score)}</dd></div>)}</dl>}
        {record?.role === "GOALKEEPER" && record.goalkeeperStats && <><GoalkeeperSummary records={[record]} /><dl className="athlete-facts">{Object.entries(goalkeeperFields).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{record.goalkeeperStats?.[key] ?? "Sem dados"}</dd></div>)}</dl></>}
        <h3>Avaliação individual</h3>{ratingEntries(record).length ? <dl className="athlete-facts">{ratingEntries(record).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{scoreLabel(value)}</dd></div>)}</dl> : <p className="athlete-note">O treinador ainda não registrou uma avaliação para este treino.</p>}
        {record?.measurementsInitialized && <><h3>Medidas quantitativas</h3>{record.measurements?.length ? <dl className="athlete-facts">{record.measurements.map((item) => <div key={item.criterionId}><dt>{item.name}</dt><dd>{item.value ?? "Não informado"}</dd></div>)}</dl> : <p className="athlete-note">Nenhuma medida configurada neste registro.</p>}</>}
        <h3>Estatísticas esportivas</h3>{Object.entries(record?.metrics || {}).some(([, value]) => Number.isFinite(value)) ? <dl className="athlete-facts">{Object.entries(record.metrics).filter(([, value]) => Number.isFinite(value)).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl> : <p className="athlete-note">Nenhuma estatística registrada.</p>}
        <Button variant="ghost" type="button" onClick={() => dialog.current.close()}>Fechar</Button>
      </div>}
  </dialog>;
}
