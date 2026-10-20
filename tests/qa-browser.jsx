// Harness exclusivo de QA: componentes/hooks reais, HTTP simulado para falhas determinísticas.
// Não usa tokens, dados ou armazenamento persistente do usuário.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EvolutionChart } from '../src/componentes/charts/GraficoEvolucao.jsx';
import { useWebKoreData } from '../src/hooks/useWebKoreData.js';
import '../src/styles/global.css';
import '../src/styles/experience.css';
const memory = new Map([['webkore-auth-token-v1', 'qa-only-token']]);
Object.defineProperty(window, 'localStorage', { value: { getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) } });
const user = { id: 'qa-a', role: 'athlete', name: 'Atleta QA' };
const training = (id, date, note) => ({ id, teamId: 'qa-team', date, type: 'Misto', athletes: { 'qa-a': { present: true, ratings: { Técnica: note } } } });
let remote = [training('qa-first', '2026-10-01', 8)];
let failure = '';
const nativeFetch = window.fetch.bind(window);
window.fetch = async (url, options = {}) => {
  if (!String(url).includes('/api/')) return nativeFetch(url, options);
  if (options.method === 'PATCH') {
    if (failure === 'network') throw new TypeError('QA simulated connection failure');
    if (failure === '503') return new Response(JSON.stringify({ message: 'QA API indisponível (503)' }), { status: 503 });
  }
  return new Response(JSON.stringify({ user, state: { users: [user], teams: [{ id: 'qa-team' }], memberships: [], trainings: remote } }), { status: 200 });
};
const hundred = Array.from({ length: 100 }, (_, i) => ({ trainingId: `qa-${i}`, date: new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10), type: 'Misto', ratings: { Técnica: i % 11 } }));
function QA() {
  const [data, actions] = useWebKoreData();
  const [message, setMessage] = useState('Pronto');
  const [mode, setMode] = useState('100');
  const [mobile, setMobile] = useState(false);
  async function fail(kind) {
    failure = kind;
    try { await actions.updateTrainingAthlete({ trainingId: 'qa-first', athleteId: user.id, patch: { ratings: { Técnica: 9 } } }); setMessage('ERRO: edição confirmada'); }
    catch (error) { setMessage(`Falha tratada: ${error.message}`); }
    finally { failure = ''; }
  }
  const points = mode === '100' ? hundred : mode === 'empty' ? [] : mode === 'single' ? [hundred[0]] :
    data.trainings.map(t => ({ trainingId: t.id, date: t.date, ratings: t.athletes[user.id].ratings }));
  return <main style={{ padding: 12, maxWidth: 1100, margin: 'auto' }}>
    <h1>QA WebKore</h1><p>Componente e hook reais; API simulada apenas nesta página de QA.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
      <button onClick={() => setMode('100')}>100 treinos</button><button onClick={() => setMode('empty')}>Sem treinos</button>
      <button onClick={() => setMode('single')}>Um treino</button><button onClick={() => setMode('session')}>Sessão conectada</button>
      <button onClick={() => { remote = [...remote, training(`qa-added-${remote.length}`, '2026-10-02', 8)]; setMessage('Treino criado no servidor simulado; aguardando atualização'); }}>Novo treino remoto</button>
      <button onClick={() => { window.dispatchEvent(new Event('focus')); setMessage('Evento de foco disparado'); }}>Voltar ao foco</button>
      <button onClick={() => fail('network')}>Falhar rede ao salvar 9</button><button onClick={() => fail('503')}>Falhar 503 ao salvar 9</button>
      {!location.search.includes('mobile') && <button onClick={() => setMobile(!mobile)}>Celular 390 px</button>}
    </div>
    <p role="status">{message}</p><p data-testid="session-count">Treinos na sessão: {data.trainings.length}; nota salva: {data.trainings[0]?.athletes[user.id].ratings.Técnica ?? 'aguardando'}; pontos exibidos: {points.length}</p>
    <EvolutionChart key={mode} data={points} criteria={['Técnica']} title="Evolução QA" />
    {mobile && <iframe title="Viewport de celular 390 px" src="/tests/qa-browser.html?mobile=1" style={{ width: 390, height: 1000, border: '2px solid #4b8fff', marginTop: 20 }} />}
  </main>;
}
createRoot(document.getElementById('root')).render(<QA />);
