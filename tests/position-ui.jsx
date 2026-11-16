import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PositionEvaluationEditor, PositionProfileSettings, GoalkeeperSummary, PositionRankings } from '../src/componentes/ui/AvaliacaoPosicao.jsx';
import { profileFor, weightedEvaluation } from '../shared/evaluations.js';
import '../src/styles/global.css';
import '../src/styles/experience.css';
import '../src/styles/paginasTreinador/ConfigsTreinador.css';
import '../src/styles/paginasTreinador/treinamentosPagina.css';
const initialTeam = { id: 'qa', modality: 'Futsal', objectiveCriteria: ['Gols', 'Assist\u00eancias', 'Desarmes'] };
function QA() {
  const [team, setTeam] = useState(initialTeam);
  const [width, setWidth] = useState(1100);
  const [role, setRole] = useState('GOALKEEPER');
  const [view, setView] = useState('evaluation');
  const [records, setRecords] = useState({ GOALKEEPER: { role: 'GOALKEEPER', position: 'Goleiro', modality: 'Futsal', ratings: {} }, OUTFIELD: { role: 'OUTFIELD', position: 'Ala', modality: 'Futsal', ratings: {} } });
  const record = records[role];
  async function save(patch) {
    setRecords((all) => { let updated = { ...all[role], ...patch }; if (patch.ratings) { const result = weightedEvaluation(record.criteriaSnapshot?.length ? record.criteriaSnapshot : profileFor(team, role), patch.ratings); updated = { ...updated, evaluationSource: 'WEIGHTED', finalScore: result.finalScore, criteriaSnapshot: result.criteria }; } return { ...all, [role]: updated }; });
  }
  return <div style={{ padding: 12 }}><nav style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    <button onClick={() => setWidth(375)}>Mobile 375</button><button onClick={() => setWidth(1100)}>Desktop 1100</button>
    <button onClick={() => setRole('GOALKEEPER')}>Goleiro</button><button onClick={() => setRole('OUTFIELD')}>Linha</button>
    <button onClick={() => setView('evaluation')}>Avaliar</button><button onClick={() => setView('settings')}>Modelos</button><button onClick={() => setView('dashboard')}>Dashboard</button>
  </nav><main style={{ width, maxWidth: '100%', margin: '20px auto' }} className="coach-settings"><section className="panel">
    <h1>WebKore: {role === 'GOALKEEPER' ? 'Goleiro' : 'Linha'}</h1>
    {view === 'evaluation' && <PositionEvaluationEditor key={role} record={record} team={team} onSave={save} />}
    {view === 'settings' && <PositionProfileSettings team={team} actions={{ updateTeam: async ({ patch }) => setTeam((t) => ({ ...t, ...patch })) }} />}
    {view === 'dashboard' && <><GoalkeeperSummary records={[records.GOALKEEPER]} /><PositionRankings rankings={{ GOALKEEPER: [], OUTFIELD: [] }} /></>}
  </section></main></div>;
}
createRoot(document.getElementById('root')).render(<QA />);
