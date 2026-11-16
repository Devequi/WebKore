// Explicit MySQL/HTTP integration run; fixtures are removed and all pre-existing rows are compared.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { createApp } from '../server/src/aplicativo.js';
import { prisma } from '../server/src/lib/prisma.js';
import { getJwtSecret } from '../server/src/lib/environment.js';
import { criteriaFor, profileFor, positionRankings, recordScore } from '../shared/evaluations.js';
import { teamReportRows } from '../src/services/reports.js';
const models = ['user', 'team', 'membership', 'training', 'trainingRecord', 'evaluation', 'sportMetric', 'evaluationProfile', 'profileCriterion', 'evaluationCriterion', 'goalkeeperStats', 'trainingMeasurement'];
const snapshot = () => Promise.all(models.map(async (model) => ({ model, digest: createHash('sha256').update(JSON.stringify(await prisma[model].findMany({ orderBy: { id: 'asc' } }))).digest('hex') })));
const before = await snapshot();
const users = [];
let server;
try {
  const makeUser = async (role) => {
    const id = randomUUID();
    await prisma.user.create({ data: { id, name: `Position QA ${role}`, email: `${id}@example.invalid`, role, passwordHash: 'fixture-no-login' } });
    users.push(id);
    return { id, token: jwt.sign({ id, role }, getJwtSecret(), { expiresIn: '10m' }) };
  };
  const coach = await makeUser('COACH'), other = await makeUser('COACH');
  const keeper = await makeUser('ATHLETE'), line = await makeUser('ATHLETE');
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function request(path, method = 'GET', body, user = coach, status = 200) {
    const res = await fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const data = res.status === 204 ? null : await res.json();
    assert.equal(res.status, status, `${method} ${path}: ${JSON.stringify(data)}`);
    return data;
  }
  const team = await request('/teams', 'POST', { name: 'Position integration', modality: 'Futsal' }, coach, 201);
  const foreign = await request('/teams', 'POST', { name: 'Other team', modality: 'Futsal' }, other, 201);
  assert.equal(team.evaluationProfiles.length, 2);
  await prisma.membership.createMany({ data: [{ teamId: team.id, athleteId: keeper.id, status: 'APPROVED', position: 'Goleiro' }, { teamId: team.id, athleteId: line.id, status: 'APPROVED', position: 'Ala' }] });
  const ratings = (role, score = 8) => Object.fromEntries(profileFor(team, role).map((item, index) => [item.name, index === 0 ? 10 : score]));
  const training = await request('/trainings', 'POST', { teamId: team.id, date: '2026-11-01', type: 'Partida', records: [
    { athleteId: keeper.id, ratings: ratings('GOALKEEPER'), goalkeeperStats: { saves: 8, goalsConceded: 2, shotsOnTarget: 10, difficultSaves: 3, accurateDistributions: 4, distributionAttempts: 5, successfulExits: 0, exitAttempts: 0 } },
    { athleteId: line.id, ratings: ratings('OUTFIELD'), metrics: { Gols: 2 } }
  ] }, coach, 201);
  let saved = training.athletes[keeper.id];
  assert.equal(training.type, 'Partida');
  assert.equal(saved.finalScore, 8.5);
  assert.equal(saved.goalkeeperIndicators.defensiveEfficiency, 80);
  assert.equal(saved.goalkeeperIndicators.exitEfficiency, null);
  assert.equal(training.athletes[line.id].finalScore, 8.5);
  const path = `/trainings/${training.id}/athletes/${keeper.id}`;
  // Changing future profiles and the current position does not alter old evaluation rows.
  const profiles = team.evaluationProfiles.map((profile) => ({ ...profile, criteria: profile.criteria.map((item) => ({ ...item, name: `${item.name} v2` })) }));
  const snapshotBefore = await prisma.evaluation.findUnique({ where: { recordId: saved.id }, include: { criteria: true } });
  await request(`/teams/${team.id}`, 'PATCH', { evaluationProfiles: profiles });
  assert.deepEqual(await prisma.evaluation.findUnique({ where: { recordId: saved.id }, include: { criteria: true } }), snapshotBefore);
  assert.notEqual((await request('/teams', 'GET', undefined, other))[0].evaluationProfiles[0].criteria[0].name, profiles[0].criteria[0].name);
  await request(`/teams/${team.id}/athletes/${keeper.id}`, 'PATCH', { position: 'Ala' });
  const patched = await request(path, 'PATCH', { ratings: { [profileFor(team, 'GOALKEEPER')[0].name]: 0 } });
  assert.equal(patched.athletes[keeper.id].role, 'GOALKEEPER');
  assert.equal(patched.athletes[keeper.id].position, 'Goleiro');
  assert.equal(patched.athletes[keeper.id].finalScore, 6);
  assert.equal(patched.athletes[keeper.id].criteriaSnapshot[0].weight, 25);
  // Invalid statistics roll back edits to the technical evaluation and presence.
  await request(path, 'PATCH', { present: false, ratings: { [profileFor(team, 'GOALKEEPER')[0].name]: 10 }, goalkeeperStats: { saves: 9 } }, coach, 400);
  saved = (await request(`/trainings/team/${team.id}`))[0].athletes[keeper.id];
  assert.equal(saved.finalScore, 6); assert.equal(saved.present, true); assert.equal(saved.goalkeeperStats.saves, 8);
  await request(path, 'PATCH', { goalkeeperStats: { distributionAttempts: 2 } }, coach, 400);
  await request(path, 'PATCH', { goalkeeperStats: { shotsOnTarget: null } });
  await request(path, 'PATCH', { goalkeeperStats: { saves: 9 } });
  await request(path, 'PATCH', { goalkeeperStats: { goalsConceded: 0 } });
  await request(path, 'PATCH', { goalkeeperStats: null }, coach, 400);
  await request(path, 'PATCH', { ratings: { unknown: 3 } }, coach, 400);
  await request(`/trainings/${training.id}/athletes/${line.id}`, 'PATCH', { goalkeeperStats: { saves: 1 } }, coach, 400);
  await request(`/teams/${team.id}`, 'PATCH', { evaluationProfiles: profiles.map((p) => ({ ...p, criteria: [{ name: '' }] })) }, coach, 400);
  await request(`/teams/${team.id}`, 'PATCH', { evaluationProfiles: profiles }, other, 404);
  await request(`/teams/${team.id}`, 'PATCH', { evaluationProfiles: profiles }, keeper, 403);
  await request(path, 'PATCH', { goalkeeperStats: { saves: 1 } }, other, 404);
  await request(path, 'PATCH', { ratings: {} }, keeper, 403);
  await request('/trainings', 'POST', { teamId: foreign.id, date: '2026-11-02', type: 'Misto', records: [{ athleteId: keeper.id, ratings: ratings('GOALKEEPER') }] }, coach, 404);
  const own = await request(`/trainings/team/${team.id}`, 'GET', undefined, keeper);
  assert.deepEqual(Object.keys(own[0].athletes), [keeper.id]);
  const newTraining = await request('/trainings', 'POST', { teamId: team.id, date: '2026-11-02', type: 'F\u00edsico', records: [{ athleteId: keeper.id }] }, coach, 201);
  assert.equal(newTraining.athletes[keeper.id].role, 'OUTFIELD');
  assert.deepEqual(newTraining.athletes[keeper.id].ratings, {});
  const nextRatings = Object.fromEntries(profiles.find((p) => p.role === 'OUTFIELD').criteria.filter((item) => item.kind === 'QUALITATIVE').map((item) => [item.name, 6]));
  await request(`/trainings/${newTraining.id}/athletes/${keeper.id}`, 'PATCH', { ratings: nextRatings });
  // Legacy data is explicitly legacy, stays readable and is excluded from consolidated futsal rankings.
  const legacy = await prisma.training.create({ data: { teamId: team.id, date: new Date('2026-10-01'), type: 'MIXED', records: { create: { athleteId: keeper.id, evaluation: { create: { technique: 10, physicalCondition: 0, participation: 6, teamwork: 8 } } } } } });
  const state = (await request('/auth/me')).state;
  const legacyRecord = state.trainings.find((t) => t.id === legacy.id).athletes[keeper.id];
  assert.equal(legacyRecord.evaluationSource, 'LEGACY'); assert.equal(recordScore(legacyRecord), 6); assert.deepEqual(legacyRecord.criteriaSnapshot, []);
  assert.deepEqual(positionRankings([{ id: keeper.id }, { id: line.id }], state.trainings), { OUTFIELD: [], GOALKEEPER: [] });
  assert.deepEqual(state.teamRankings[team.id], { OUTFIELD: [], GOALKEEPER: [] });
  const rows = teamReportRows(state, team);
  assert.equal(rows.length, 5); // header + two records in match + new training + legacy
  assert.equal(rows.find((row) => row[13] === training.id && row[14] === keeper.id)[8], 'Goleiro');
  // Weighted snapshots and all private statistics are available after session reload.
  const athleteState = (await request('/auth/me', 'GET', undefined, keeper)).state;
  assert.deepEqual(athleteState.teamRankings, {});
  assert.ok(athleteState.trainings.every((t) => Object.keys(t.athletes).every((id) => id === keeper.id)));
  assert.equal(athleteState.trainings.find((t) => t.id === training.id).athletes[keeper.id].goalkeeperStats.goalsConceded, 0);
  // Pending records have no persisted evaluation, even after a session reload.
  const pendingTraining = await request('/trainings', 'POST', { teamId: team.id, date: '2026-11-03', type: 'Misto', records: [
    { athleteId: keeper.id, present: true }, { athleteId: line.id, present: false }
  ] }, coach, 201);
  const pendingPath = `/trainings/${pendingTraining.id}/athletes/${keeper.id}`;
  assert.equal(await prisma.evaluation.count({ where: { recordId: pendingTraining.athletes[keeper.id].id } }), 0);
  assert.equal(pendingTraining.athletes[keeper.id].evaluationSource, null);
  assert.deepEqual(pendingTraining.athletes[line.id].ratings, {});
  const linePendingPath = `/trainings/${pendingTraining.id}/athletes/${line.id}`;
  await request(linePendingPath, 'PATCH', { ratings: nextRatings }, coach, 400);
  const confirmed = await request(pendingPath, 'PATCH', { ratings: nextRatings });
  assert.equal(confirmed.athletes[keeper.id].finalScore, 6);
  assert.equal(confirmed.athletes[keeper.id].evaluationSource, 'AVERAGE');
  assert.equal((await request('/auth/me')).state.trainings.find((t) => t.id === pendingTraining.id).athletes[keeper.id].finalScore, 6);
  const fourProfiles = ['GOALKEEPER', 'FIXO', 'ALA', 'PIVOT'].map((role) => ({ modality: 'Futsal', role, criteria: [] }));
  await request(`/teams/${team.id}`, 'PATCH', { evaluationProfiles: fourProfiles }, coach, 400);
  const lineProfile = profiles.find((profile) => profile.role === 'OUTFIELD');
  const quant = lineProfile.criteria.filter((item) => item.kind === 'QUANTITATIVE');
  const keepQuant = profiles.find((profile) => profile.role === 'GOALKEEPER').criteria.filter((item) => item.kind === 'QUANTITATIVE');
  await request(pendingPath, 'PATCH', { measurements: { [quant[0].id]: 42, [quant[1].id]: 0 } });
  let measurementRecord = (await request('/auth/me')).state.trainings.find((t) => t.id === pendingTraining.id).athletes[keeper.id];
  assert.equal(measurementRecord.finalScore, 6); // quantities never affect the grade
  assert.equal(measurementRecord.measurements.find(item=>item.criterionId===quant[0].id).value,42);
  assert.equal(measurementRecord.measurements.find(item=>item.criterionId===quant[1].id).value,0);
  assert.equal(measurementRecord.measurements.find(item=>item.criterionId===quant[2].id).value,null);
  await request(pendingPath, 'PATCH', { measurements: { [keepQuant[0].id]: 3 } }, coach, 400);
  await request(pendingPath, 'PATCH', { measurements: null }, coach, 400);
  await request(pendingPath, 'PATCH', { measurements: { [quant[0].id]: -1 } }, coach, 400);
  await request(pendingPath, 'PATCH', { measurements: { [quant[0].id]: 1.5 } }, coach, 400);
  await request(linePendingPath, 'PATCH', { measurements: { [quant[0].id]: 2 } }, coach, 400);
  await request(path, 'PATCH', { measurements: { [quant[0].id]: 4 } }, coach, 400); // recorded keeper remains keeper after position change
  await request(pendingPath, 'PATCH', { ratings: { Reflexos: 9 } }, coach, 400);
  const sixth = {...lineProfile,criteria:[...lineProfile.criteria,{id:randomUUID(),kind:'QUALITATIVE',name:'Fifth'}]};
  await request(`/teams/${team.id}`, 'PATCH', { evaluationProfiles: profiles.map(p=>p.role==='OUTFIELD'?sixth:p) },coach,400);
  const wrongType = profiles.map(p=>({...p,criteria:p.criteria.map((item,i)=>p.role==='OUTFIELD'&&i===0?{...item,kind:'QUANTITATIVE'}:item)}));
  await request(`/teams/${team.id}`, 'PATCH', { evaluationProfiles: wrongType },coach,400);
  const foreignCriteria = foreign.evaluationProfiles.find(p=>p.role==='OUTFIELD').criteria;
  await request(`/teams/${team.id}`, 'PATCH', { evaluationProfiles: profiles.map(p=>p.role==='OUTFIELD'?{...p,criteria:foreignCriteria}:p) },coach,400);
  // Rename a quantity and remove a qualitative criterion: old snapshots stay byte-for-byte intact.
  const beforeMeasurements = await prisma.trainingMeasurement.findMany({where:{recordId:measurementRecord.id},orderBy:{id:'asc'}});
  const unchangedKeeper = await prisma.evaluationProfile.findFirst({where:{teamId:team.id,role:'GOALKEEPER'},include:{criteria:{orderBy:{id:'asc'}}}});
  const revised = profiles.map(p=>p.role==='OUTFIELD'?{...p,criteria:p.criteria.filter(item=>item.id!==p.criteria[0].id).map(item=>item.id===quant[0].id?{...item,name:'Finalizações totais'}:item)}:p);
  await request(`/teams/${team.id}`, 'PATCH', {evaluationProfiles:revised});
  assert.deepEqual(await prisma.trainingMeasurement.findMany({where:{recordId:measurementRecord.id},orderBy:{id:'asc'}}),beforeMeasurements);
  assert.deepEqual(await prisma.evaluationProfile.findFirst({where:{teamId:team.id,role:'GOALKEEPER'},include:{criteria:{orderBy:{id:'asc'}}}}),unchangedKeeper);
  const savedCriteria = await prisma.profileCriterion.findUnique({where:{id:quant[0].id}});
  assert.equal(savedCriteria.name,'Finalizações totais'); assert.equal(savedCriteria.kind,'QUANTITATIVE');
  await request(pendingPath,'PATCH',{measurements:{[quant[0].id]:43}});
  measurementRecord = (await request('/auth/me')).state.trainings.find(t=>t.id===pendingTraining.id).athletes[keeper.id];
  assert.equal(measurementRecord.measurements.find(item=>item.criterionId===quant[0].id).name,quant[0].name);
  assert.equal(measurementRecord.measurements.find(item=>item.criterionId===quant[0].id).value,43);
  const unchanged = await request(pendingPath, 'PATCH', { ratings: { [Object.keys(nextRatings)[0]]: 0 } });
  assert.equal(unchanged.athletes[keeper.id].finalScore, 4.5);
  const next = await request('/trainings', 'POST', { teamId: team.id, date: '2026-11-04', type: 'Misto', records: [{ athleteId: keeper.id }] }, coach, 201);
  const nextPath = `/trainings/${next.id}/athletes/${keeper.id}`;
  const newRatings = Object.fromEntries(revised.find(p=>p.role==='OUTFIELD').criteria.filter(item=>item.kind==='QUALITATIVE').map(item=>[item.name,9]));
  const nextSaved = await request(nextPath, 'PATCH', { ratings: newRatings, measurements:{[quant[0].id]:80} });
  assert.equal(nextSaved.athletes[keeper.id].finalScore,9);
  assert.equal(nextSaved.athletes[keeper.id].measurements.find(item=>item.criterionId===quant[0].id).name,'Finalizações totais');
  const exported = teamReportRows((await request('/auth/me')).state,team);
  assert.match(exported.find(row=>row[13]===next.id)[7],/Finalizações totais: 80/);
  const privateMeasurements = (await request('/auth/me','GET',undefined,keeper)).state.trainings.find(t=>t.id===next.id).athletes[keeper.id].measurements;
  assert.equal(privateMeasurements.find(item=>item.criterionId===quant[0].id).value,80);
  // Quantities can be saved before reviewing notes without creating a fictional evaluation.
  const quantityOnly = await request('/trainings','POST',{teamId:team.id,date:'2026-11-05',type:'Misto',records:[{athleteId:line.id}]},coach,201);
  const quantityPath = `/trainings/${quantityOnly.id}/athletes/${line.id}`;
  const quantitySaved = await request(quantityPath,'PATCH',{measurements:{[quant[0].id]:72}});
  assert.equal(quantitySaved.athletes[line.id].evaluationSource,null);
  assert.equal(quantitySaved.athletes[line.id].finalScore,null);
  assert.deepEqual(quantitySaved.athletes[line.id].ratings,{});
  assert.equal(await prisma.evaluation.count({where:{recordId:quantitySaved.athletes[line.id].id}}),0);
  const fiveQuantities = revised.map(p=>p.role==='OUTFIELD'?{...p,criteria:[...p.criteria,{id:randomUUID(),name:'Fifth count',kind:'QUANTITATIVE'}]}:p);
  await request(`/teams/${team.id}`,'PATCH',{evaluationProfiles:fiveQuantities},coach,400);
  // An explicitly empty profile is valid; its empty historical quantity snapshot stays empty.
  const empty = revised.map(p=>p.role==='OUTFIELD'?{...p,criteria:[]}:p);
  await request(`/teams/${team.id}`,'PATCH',{evaluationProfiles:empty});
  const emptyTraining = await request('/trainings','POST',{teamId:team.id,date:'2026-11-06',type:'Misto',records:[{athleteId:line.id}]},coach,201);
  const emptyPath = `/trainings/${emptyTraining.id}/athletes/${line.id}`;
  const emptySaved = await request(emptyPath,'PATCH',{measurements:{}});
  assert.equal(emptySaved.athletes[line.id].measurementsInitialized,true);
  assert.deepEqual(emptySaved.athletes[line.id].measurements,[]);
  const movedArchived = empty.map(p=>p.role==='GOALKEEPER'?{...p,criteria:[...p.criteria.filter(item=>item.id!==keepQuant[0].id),{...quant[0],name:'Moved archived'}]}:p);
  await request(`/teams/${team.id}`,'PATCH',{evaluationProfiles:movedArchived},coach,400);
  const changedArchivedType = empty.map(p=>p.role==='OUTFIELD'?{...p,criteria:[{...lineProfile.criteria[0],kind:'QUANTITATIVE'}]}:p);
  await request(`/teams/${team.id}`,'PATCH',{evaluationProfiles:changedArchivedType},coach,400);
  await request(`/teams/${team.id}`,'PATCH',{evaluationProfiles:revised});
  await request(emptyPath,'PATCH',{measurements:{[quant[0].id]:1}},coach,400);
  const oldCriteria = [{ name: 'Old A', weight: 80, score: 10, order: 0 }, { name: 'Old B', weight: 20, score: 0, order: 1 }];
  const historical = await prisma.training.create({ data: { teamId: team.id, date: new Date('2026-10-02'), type: 'MIXED', records: { create: {
    athleteId: keeper.id, present: true, evaluation: { create: { source: 'WEIGHTED', modality: 'Futsal', position: 'Goleiro', role: 'GOALKEEPER', finalScore: 8, criteria: { create: oldCriteria } } }
  } } } });
  const historicalPatch = await request(`/trainings/${historical.id}/athletes/${keeper.id}`, 'PATCH', { ratings: { 'Old A': 5 } });
  assert.equal(historicalPatch.athletes[keeper.id].finalScore, 4);
  assert.deepEqual(historicalPatch.athletes[keeper.id].criteriaSnapshot.map((item) => item.weight), [80, 20]);
  console.log('Position integration OK: MySQL persistence, snapshots, statistics, transactions, authorization, team isolation, legacy data and reports.');
} finally {
  try {
    if (users.length) {
      await prisma.team.deleteMany({ where: { coachId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
    assert.deepEqual(await snapshot(), before, 'Pre-existing database rows must remain unchanged.');
    console.log('Integration fixtures removed; all pre-existing database rows preserved.');
  } finally {
    await prisma.$disconnect();
    if (server) await new Promise((resolve) => server.close(resolve));
  }
}
