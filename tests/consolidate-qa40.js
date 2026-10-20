// Combina a execução HTTP/MySQL com evidências suplementares de navegador.
// Não altera nem apaga o resultado bruto, inclusive suas reprovações.
import { readFile, writeFile } from 'node:fs/promises';
const dir = new URL('../Documentação/qa-40/', import.meta.url);
const raw = JSON.parse(await readFile(new URL('resultados.json', dir), 'utf8'));
const browser = JSON.parse(await readFile(new URL('navegador.json', dir), 'utf8'));
if (browser.executionRun !== raw.run) throw new Error('As evidências do navegador pertencem a outra execução. Refaça o complemento antes de consolidar.');
const results = raw.results.map(result => {
  const extra = browser.observations.find(item => item.id === result.id);
  return extra ? { ...result, status: extra.status, originalStatus: result.status, browserEvidence: extra.evidence } : result;
});
const summary = results.reduce((counts, result) => ({ ...counts, [result.status]: (counts[result.status] || 0) + 1 }), {});
await writeFile(new URL('resultados-consolidados.json', dir), JSON.stringify({ ...raw, method: `${raw.method}; complemento manual no navegador descrito em navegador.json`, browserEnvironment: browser.environment, summary, results }, null, 2));
console.log(JSON.stringify({ summary, preserved: raw.preserved }));
