import { stripVTControlCharacters } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cases } from './catalogue.mjs';

export const reportFile = new URL('../../docs/testes-ct20.md', import.meta.url);
export const jsonFile = new URL('../../test-results/ct20/results.json', import.meta.url);
const cell = text => String(text || '').replaceAll('|', '\\|').replaceAll('\n', ' ');

export async function writeReport(data) {
  try {
    const audit = JSON.parse((await readFile(new URL('../../test-results/ct20/dependency-audit.json', import.meta.url), 'utf8')).replace(/^\uFEFF/, ''));
    data = { ...data, dependencyAudit: { counts: audit.metadata?.vulnerabilities,
      packages: Object.entries(audit.vulnerabilities || {}).map(([name, value]) => ({ name, severity: value.severity })) } };
  } catch {}
  await mkdir(new URL('.', reportFile), { recursive: true });
  await mkdir(new URL('.', jsonFile), { recursive: true });
  const rows = cases.map(item => ({ ...item, ...data.results?.find(result => result.id === item.id) }));
  const status = item => item.status === 'passed' ? 'Aprovado' : item.status ? 'Falhou' : 'Não executado';
  const markdown = [
    '# WebKore — 20 casos automatizados', '',
    `Execução UTC: ${data.date || new Date().toISOString()}.`,
    `Resultado: ${rows.filter(item => item.status === 'passed').length}/20 aprovados.`,
    `Navegador: ${data.browser || process.env.WEBKORE_TEST_BROWSER_CHANNEL || 'chromium'} headless.`,
    `Isolamento: ${data.isolation || 'Aguardando execução.'}`,
    `Limpeza: ${data.cleanup || 'Aguardando encerramento do executor.'}`, '',
    '## Análise e execução', '',
    'O projeto utiliza React/Vite, Express, Prisma/MySQL e JWT. Os testes existentes com node:test foram preservados. A suíte CT20 acrescenta Playwright para usar a interface real, requisições HTTP e consultas ao banco temporário, além de funções unitárias reais de avaliação.', '',
    'Execute `npm run test:ct20`. O executor cria um banco exclusivo com nome aleatório, inicializa o schema e a API e sobe o Vite em portas livres. Não usa a API nem o frontend em execução do usuário. Cada caso cria contas fictícias próprias e faz sua limpeza; o banco criado nesta execução é removido no finally. Uma falha de isolamento interrompe os testes sem recorrer ao banco principal.', '',
    'O navegador usa um perfil temporário. Chromium é o padrão; instale-o com `npm run test:ct20:install`. Para um navegador já instalado, use WEBKORE_TEST_BROWSER_CHANNEL=msedge ou chrome. WEBKORE_TEST_DATABASE_URL pode fornecer a conexão de um servidor MySQL de testes; o executor sempre cria outro banco novo nesse servidor. Na ausência dessa variável, usa somente a conexão administrativa do servidor configurado em DATABASE_URL para criar e remover o banco temporário, sem consultar ou alterar as tabelas do banco principal.', '',
    '## Resultados', '',
    '| ID | Funcionalidade | Resultado esperado | Resultado obtido | Status |',
    '|---|---|---|---|---|',
    ...rows.map(item => `| ${item.id} | ${cell(item.title)} | ${cell(item.expected)} | ${cell(item.obtained || data.error || 'Não executado.')} | ${status(item)} |`), '',
    '## Regras e limites', '',
    '- CT-04 foi atualizado para a política implementada na auditoria: logout revoga a sessão persistida no servidor. O teste exige 401 ao reutilizar uma cópia do JWT.',
    '- CT-13 distingue rascunho automático de nota persistida: 5 só é gravado após confirmação e salvamento.',
    '- As medições de CT-20 cobrem os tamanhos listados em Chromium/Edge/Chrome conforme o canal escolhido. Não equivalem a uma matriz completa de navegadores ou dispositivos.',
    '- Falhas geram saída não zero; não há retries nem resultados esperados rebaixados. Evidências de navegador (captura e trace em falhas) ficam em test-results/ct20.', '',
    '## Diagnóstico e correções', '',
    'Na primeira execução, CT-02 usava um nome acessível exato que excluía o texto auxiliar do campo de nascimento, e CT-14 procurava um status global em uma página com dois status. Os seletores foram corrigidos para o campo correto e para a área de salvamento, mantendo todas as asserções funcionais. A referência obsoleta a PositionRankings na página antiga tests/dadosFicticios/position-ui.jsx foi substituída pelo componente atual AverageRankings. Não foi necessário alterar cálculos ou regras de negócio.', '',
    ...(data.dependencyAudit?.counts ? ['## Auditoria de dependências', '',
      `A auditoria npm, separada dos 20 casos funcionais, registrou ${data.dependencyAudit.counts.total} alertas na árvore existente: ${data.dependencyAudit.counts.critical} crítico(s), ${data.dependencyAudit.counts.high} alto(s), ${data.dependencyAudit.counts.moderate} moderado(s) e ${data.dependencyAudit.counts.low} baixo(s).`,
      `Pacotes: ${data.dependencyAudit.packages.map(item => `${item.name} (${item.severity})`).join(', ')}.`,
      'As dependências foram revisadas na auditoria de segurança; consulte docs/auditoria-seguranca.md. O resultado bruto desta execução está em test-results/ct20/dependency-audit.json.', ''] : []),
    '## Especificação dos casos', '',
    ...rows.flatMap(item => [`### ${item.id} — ${item.title}`, '', `- Camada: ${item.layer}`, `- Objetivo: ${item.objective}`, `- Pré-condições: ${item.preconditions}`, `- Entrada: ${item.input}`, `- Passos: ${item.steps}`, `- Esperado: ${item.expected}`, `- Obtido: ${item.obtained || data.error || 'Não executado.'}`, `- Status: ${status(item)}`, ''])
  ].join('\n');
  await writeFile(jsonFile, JSON.stringify({ ...data, results: rows }, null, 2));
  if (/^webkore_ct20_[a-f0-9]{32}$/.test(process.env.WEBKORE_CT20_DB_NAME || '')) {
    const runFile = new URL(`../../test-results/ct20/runs/${process.env.WEBKORE_CT20_DB_NAME}/results.json`, import.meta.url);
    await mkdir(new URL('.', runFile), { recursive: true });
    await writeFile(runFile, JSON.stringify({ ...data, results: rows }, null, 2));
  }
  await writeFile(reportFile, markdown);
}

export default class CT20Reporter {
  constructor() { this.results = []; }
  onTestEnd(test, result) {
    const id = test.title.match(/CT-\d{2}/)?.[0];
    this.results = this.results.filter(item => item.id !== id);
    this.results.push({ id, status: result.status, durationMs: result.duration,
      obtained: result.status === 'passed' ? test.annotations.find(item => item.type === 'obtido')?.description || 'Asserções concluídas.' : stripVTControlCharacters(result.error?.message || '').replace(/(Bearer\s+)[\w.-]+/gi, '$1[redigido]') || result.status });
  }
  async onEnd() {
    await writeReport({ date: new Date().toISOString(), isolation: `Banco exclusivo ${process.env.WEBKORE_CT20_DB_NAME}.`, results: this.results });
  }
}
