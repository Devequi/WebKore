import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateGoalkeeperStats, evaluationRole, goalkeeperIndicators, MIN_RANKING_EVALUATIONS, positionRankings, profileFor, recordScore, validateGoalkeeperStats, validateProfile, weightedEvaluation, arithmeticEvaluation, initialRatings, criteriaFor, validateTypedCriteria, validateMeasurements } from '../shared/evaluations.js';
import { prepareEvaluation, recordContext } from '../server/src/lib/avaliacoes.js';
import { toClientTraining } from '../server/src/lib/serializadores.js';
import { athletePerformance } from '../src/utils/athletePerformance.js';
import { teamPerformance } from '../src/utils/teamPerformance.js';
import { teamReportRows } from '../src/services/reports.js';

const team = { id: 't', modality: 'Futsal' };
const profile = ['Defesas e eficiência', 'Posicionamento', 'Reflexos e reação', 'Reposição de bola', 'Comunicação'].map((name, i) => ({ name, weight: [35, 25, 15, 15, 10][i], order: i }));
const ratings = Object.fromEntries(profile.map((item, i) => [item.name, [10, 8, 6, 4, 2][i]]));
const context = recordContext(team, { position: 'Goleiro' });
const weighted = () => { const result = weightedEvaluation(profile, ratings); return { role: 'GOALKEEPER', position: 'Goleiro', modality: 'Futsal', evaluationSource: 'WEIGHTED', ratings, criteriaSnapshot: result.criteria, finalScore: result.finalScore }; };

test('weighted score uses every weight and accepts zero, ten and decimal scores', () => {
  assert.equal(weighted().finalScore, 7.2);
  for (const score of [0, 10, 2.5]) assert.equal(weightedEvaluation(profile, Object.fromEntries(profile.map((p) => [p.name, score]))).finalScore, score);
  for (const value of [-1, 11, NaN, Infinity, null, '8']) assert.throws(() => weightedEvaluation(profile, { ...ratings, [profile[0].name]: value }));
  assert.throws(() => weightedEvaluation(profile, {}));
  assert.throws(() => weightedEvaluation(profile, { ...ratings, unknown: 5 }));
});
test('profiles validate sum, duplicate names, missing criteria and nonpositive weights', () => {
  for (const criteria of [[], profile.map((p) => ({ ...p, weight: 10 })), [{ name: 'A', weight: 100 }, { name: 'a', weight: 0 }], [{ name: '', weight: 100 }], [{ name: 'A', weight: '100' }]]) assert.throws(() => validateProfile(criteria, true));
  assert.equal(validateProfile(profile, true).reduce((sum, p) => sum + p.weight, 0), 100);
});
test('position-specific defaults do not apply to other sports; configuration stays team-specific', () => {
  assert.equal(evaluationRole('Futsal', 'Goleiro'), 'GOALKEEPER');
  for (const position of ['Ala', 'Fixo', 'Piv\u00f4']) assert.equal(evaluationRole('Futsal', position), 'OUTFIELD');
  assert.equal(evaluationRole('Futebol', 'Goleiro'), null);
  assert.equal(profileFor({ modality: 'Basquete' }, 'GOALKEEPER'), null);
  const custom = { ...team, evaluationProfiles: [{ modality: 'Futsal', role: 'GOALKEEPER', schemaVersion: 2, criteria: [{ id: 'custom', kind: 'QUALITATIVE', name: 'Custom', weight: 100, order: 0 }] }] };
  assert.equal(profileFor(custom, 'GOALKEEPER')[0].name, 'Custom');
  assert.equal(profileFor(team, 'GOALKEEPER').length, 4);
  assert.notDeepEqual(profileFor(team, 'OUTFIELD'), profile);
});
test('goalkeeper observations validate consistency and preserve unknown versus zero', () => {
  assert.equal(validateGoalkeeperStats({ saves: 0 }).saves, 0);
  assert.equal(validateGoalkeeperStats({}).saves, null);
  for (const stats of [{ saves: -1 }, { saves: 0.1 }, { saves: '2' }, { unknown: 0 }, { difficultSaves: 3, saves: 2 }, { accurateDistributions: 4, distributionAttempts: 3 }, { successfulExits: 2, exitAttempts: 1 }, { saves: 4, goalsConceded: 1, shotsOnTarget: 4 }]) assert.throws(() => validateGoalkeeperStats(stats));
  assert.equal(validateGoalkeeperStats({ saves: 4, goalsConceded: 1, shotsOnTarget: 5 }).saves, 4);
});
test('ratios avoid zero divisions and aggregate paired observations rather than averages of percentages', () => {
  assert.deepEqual(goalkeeperIndicators({}), { defensiveEfficiency: null, distributionAccuracy: null, exitEfficiency: null });
  assert.equal(goalkeeperIndicators({ saves: 0, goalsConceded: 0 }).defensiveEfficiency, null);
  const records = [{ role: 'GOALKEEPER', goalkeeperStats: { saves: 1, goalsConceded: 1, accurateDistributions: 1, distributionAttempts: 1 } },
    { role: 'GOALKEEPER', goalkeeperStats: { saves: 9, goalsConceded: 1, accurateDistributions: 1, distributionAttempts: 9 } },
    { role: 'GOALKEEPER', goalkeeperStats: { saves: 100 } }];
  const aggregate = aggregateGoalkeeperStats(records);
  assert.equal(aggregate.saves, 110);
  assert.equal(aggregate.defensiveEfficiency, 10 / 12 * 100);
  assert.equal(aggregate.distributionAccuracy, 20);
});
test('weight changes and position changes cannot rewrite evaluation snapshots', () => {
  const original = { role: "GOALKEEPER", position: "Goleiro", modality: "Futsal", source: "WEIGHTED", ...weightedEvaluation(profile, ratings), criteria: { create: weightedEvaluation(profile, ratings).criteria } };
  const existing = { ...original, criteria: original.criteria.create };
  const changed = { ...team, evaluationProfiles: [{ modality: 'Futsal', role: 'GOALKEEPER', criteria: [{ name: 'Other', weight: 100, order: 0 }] }] };
  const edited = prepareEvaluation({ ...context, positionSnapshot: 'Ala', roleSnapshot: 'OUTFIELD' }, changed, { [profile[0].name]: 0 }, existing);
  assert.equal(edited.position, 'Goleiro');
  assert.equal(edited.role, 'GOALKEEPER');
  assert.deepEqual(edited.criteria.create.map((p) => p.weight), [35, 25, 15, 15, 10]);
  assert.equal(original.finalScore, 7.2);
  assert.equal(edited.finalScore, 3.7);
});
test('legacy evaluations keep original scores without invented criteria or ranking eligibility', () => {
  const result = toClientTraining({ records: [{ athleteId: 'a', evaluation: { technique: 8, physicalCondition: 4, participation: 0, teamwork: 8, source: 'LEGACY' } }] }, team).athletes.a;
  assert.equal(result.evaluationSource, 'LEGACY');
  assert.equal(recordScore(result), 5);
  assert.deepEqual(result.criteriaSnapshot, []);
  assert.equal(result.position, null);
  assert.deepEqual(positionRankings([{ id: 'a' }], [{ athletes: { a: result } }]), { OUTFIELD: [], GOALKEEPER: [] });
});
test('rankings separate roles, enforce minimum and deterministic ties, and ignore invalid records', () => {
  const athletes = [{ id: 'b' }, { id: 'a' }, { id: 'line' }, { id: 'once' }];
  const trainings = Array.from({ length: MIN_RANKING_EVALUATIONS }, () => ({ athletes: { a: weighted(), b: weighted(), line: { ...weighted(), role: 'OUTFIELD' } } }));
  trainings[0].athletes.once = { ...weighted(), finalScore: 10 };
  trainings[0].athletes.invalid = { ...weighted(), finalScore: NaN };
  const ranks = positionRankings(athletes, trainings);
  assert.deepEqual(ranks.GOALKEEPER.map((a) => a.id), ['a', 'b']);
  assert.equal(ranks.GOALKEEPER[0].evaluationCount, 3);
  assert.deepEqual(ranks.OUTFIELD.map((a) => a.id), ['line']);
});
test('dashboards and reports use weighted final scores and export historical context', () => {
  const record = { ...weighted(), present: true, goalkeeperStats: { saves: 4, goalsConceded: 1 } };
  const training = { id: 'history', teamId: 't', date: '2026-11-01', athletes: { a: record } };
  assert.equal(athletePerformance([training], 'a').averageScore, 7.2);
  assert.equal(teamPerformance([training], 't').averageScore, 7.2);
  const rows = teamReportRows({ trainings: [training, { ...training, teamId: 'other', id: 'foreign' }], users: [] }, team);
  assert.equal(rows.length, 2);
  assert.equal(rows[1][6], 7.2);
  assert.equal(rows[1][8], 'Goleiro');
  assert.match(rows[1][10], /35%/);
  assert.match(rows[1][11], /4/);
  assert.match(rows[1][12], /80.00%/);
  assert.equal(rows[1][13], 'history');
});

test('new evaluations use only qualitative criteria and preserve their IDs and names on edit', () => {
  const current = profileFor(team, 'GOALKEEPER');
  const scores = Object.fromEntries(current.map((item, i) => [item.name, [10,8,6,4][i]]));
  const original = prepareEvaluation(context, team, scores);
  assert.equal(original.source, 'AVERAGE'); assert.equal(original.finalScore, 7);
  assert.deepEqual(original.criteria.create.map((item) => item.criterionId), current.map((item) => item.id));
  const existing = { ...original, criteria: original.criteria.create };
  const edited = prepareEvaluation(context, { ...team, evaluationProfiles: [] }, { [current[0].name]: 0 }, existing);
  assert.equal(edited.finalScore, 4.5);
  const serialized = toClientTraining({ records: [{ athleteId: 'a', present: true, evaluation: { ...original, criteria: original.criteria.create } }] }, team).athletes.a;
  assert.equal(recordScore(serialized), 7);
  assert.deepEqual(serialized.ratings, scores);
  assert.equal(athletePerformance([{id:'t',date:'2026-11-01',athletes:{a:serialized}}], 'a').averageScore, 7);
});
test('two independent profiles enforce four criteria per type and stable IDs', () => {
  const line = ['QUALITATIVE','QUANTITATIVE'].flatMap(kind => criteriaFor(team, 'OUTFIELD', kind));
  assert.equal(validateTypedCriteria(line).length, 8);
  assert.deepEqual(initialRatings(profileFor(team, 'OUTFIELD')), Object.fromEntries(profileFor(team,'OUTFIELD').map(item=>[item.name,5])));
  assert.equal(initialRatings([{name:'A'}],{A:0}).A,0);
  for(const position of ['Ala','Fixo','Pivô']) assert.deepEqual(profileFor(team,evaluationRole('Futsal',position)),profileFor(team,'OUTFIELD'));
  const custom = {...team,evaluationProfiles:[{modality:'Futsal',role:'OUTFIELD',schemaVersion:2,criteria:[{id:'coverage',name:'Cobertura',kind:'QUALITATIVE',order:0}]}]};
  assert.equal(profileFor(custom,'OUTFIELD')[0].name,'Cobertura');
  assert.notEqual(profileFor(custom,'GOALKEEPER')[0].name,'Cobertura');
  const ninth = {...line[0],id:'extra',name:'Extra'};
  assert.throws(()=>validateTypedCriteria([...line,ninth]));
  assert.throws(()=>validateTypedCriteria([...line.filter(item=>item.kind==='QUALITATIVE'),ninth]));
  assert.throws(()=>validateTypedCriteria([...line.filter(item=>item.kind==='QUANTITATIVE'),{...ninth,kind:'QUANTITATIVE'}]));
  assert.throws(()=>validateTypedCriteria([{id:'a',kind:'QUALITATIVE',name:'A'},{id:'b',kind:'QUALITATIVE',name:'á'}]));
  assert.throws(()=>validateTypedCriteria([{id:'a',kind:'INVALID',name:'A'}]));
  assert.throws(()=>validateTypedCriteria([{kind:'QUALITATIVE',name:'A'}]));
  assert.deepEqual(validateTypedCriteria([]),[]);
});
test('quantities accept zero and counts above ten, reject another profile and never affect grade', () => {
  const criteria = criteriaFor(team,'GOALKEEPER','QUANTITATIVE');
  const result = validateMeasurements(criteria,{[criteria[0].id]:42,[criteria[1].id]:0});
  assert.equal(result[0].value,42); assert.equal(result[1].value,0); assert.equal(result[2].value,null);
  for(const value of [-1,1.2,'4',NaN,Infinity,2147483648]) assert.throws(()=>validateMeasurements(criteria,{[criteria[0].id]:value}));
  assert.throws(()=>validateMeasurements(criteria,{[criteriaFor(team,'OUTFIELD','QUANTITATIVE')[0].id]:5}));
  const record = { evaluationSource:'AVERAGE',finalScore:8,measurements:result };
  assert.equal(recordScore(record),8);
});
test('old records without a modality snapshot keep the legacy editing contract', async () => {
  const { evaluationProfile, evaluationDraft, draftScore } = await import('../src/utils/evaluationDraft.js');
  const configured = { ...team, qualitativeCriteria: ['Técnica', 'Participação'] };
  const old = { present: true, modality: null, ratings: { Técnica: 0, Participação: 8 } };
  const applicable = evaluationProfile(old, configured, { position: 'Goleiro' });
  assert.deepEqual(applicable.map((item) => item.name), ['Técnica', 'Participação']);
  const draft = evaluationDraft(old, applicable);
  assert.equal(draft.confirmed, false);
  assert.equal(draft.ratings.Técnica, 0);
  assert.equal(draftScore(old, applicable, draft.ratings), 4);
});

test('backend rejects a mismatched position and profile even with valid grade names', () => {
  const scores = initialRatings(profileFor(team,'GOALKEEPER'));
  assert.throws(()=>prepareEvaluation({...context,positionSnapshot:'Fixo',roleSnapshot:'GOALKEEPER'},team,scores));
});
