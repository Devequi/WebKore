# Revisão técnica do WebKore — 30/09/2026

## Resultado e escopo

Revisão do código existente com alterações pontuais. O frontend compila, a API
inicia e a conexão MySQL respondeu a `SELECT 1`. Schema, migrations, dados do
banco, endpoints, contratos HTTP, navegação e estilos ativos foram preservados.
Não houve atualização de versões, publicação ou execução de migrations.

Há falhas preexistentes importantes descritas abaixo. O build aprovado não
significa que todos os fluxos estejam integrados ou prontos para dados reais.

## Estrutura e funcionamento real

- Um `package.json` na raiz atende frontend, API e Prisma.
- `index.html` → `src/principal.jsx` → `src/App.jsx`: React e navegação por estado.
- `useWebKoreData` concentra as ações locais; `storage.js` persiste o estado
  `webkore-state-v2`. Login compara e-mail, perfil e senha no estado local.
- `api.js` implementa fetch, Bearer JWT, tratamento de erros e endpoints. Seus
  métodos HTTP não são chamados pelos fluxos atuais; o logout utiliza apenas
  `setAuthToken(null)`. O serviço foi mantido para não descartar a integração existente.
- `offlineQueue.js` registra ações no LocalStorage. `flushQueue` altera status
  para `synced`, sem requisição HTTP ou confirmação do backend.
- Componentes compartilhados: shell, cabeçalho, avatar, botão, KPI, estado vazio
  e gráfico. `selectors.js`, `formatters.js`, `runUiAction.js` e `reports.js`
  fornecem consultas locais, formatação, tratamento de ações e exportação CSV.
- `server/indice.js` inicia Express; `aplicativo.js` monta health e três routers.
  `lib/prisma.js` mantém uma instância do PrismaClient na API. O seed tem uma
  instância própria por ser outro processo.
- Prisma/MySQL: `User`, `Team`, `Membership`, `Training`, `TrainingRecord`,
  `Evaluation` e `SportMetric`; enums de perfil, vínculo e tipo de treino.
  Relações, unicidades e exclusões em cascata existentes foram mantidas.

### Rotas da API

| Método | Caminho | Acesso atual |
| --- | --- | --- |
| GET | `/api/health` | Público; verifica processo, sem consulta ao banco |
| POST | `/api/auth/register`, `/api/auth/login` | Público |
| GET/PATCH/DELETE | `/api/auth/me` | JWT |
| GET | `/api/teams` | JWT |
| POST | `/api/teams` | Treinador |
| POST | `/api/teams/join` | Atleta |
| PATCH/DELETE | `/api/teams/:teamId` | Treinador proprietário |
| PATCH | `/api/teams/:teamId/requests/:athleteId` | Treinador proprietário |
| PATCH/DELETE | `/api/teams/:teamId/athletes/:athleteId` | Próprio atleta ou treinador proprietário |
| GET | `/api/trainings/team/:teamId` | Treinador proprietário ou atleta aprovado |
| POST | `/api/trainings` | Treinador proprietário da equipe informada |
| PATCH | `/api/trainings/:trainingId/athletes/:athleteId` | Treinador proprietário |
| DELETE | `/api/trainings/:trainingId` | Treinador proprietário |

A autenticação do backend utiliza bcrypt e JWT com validade de sete dias.
As permissões de escrita verificam perfil/propriedade nas rotas. As permissões
de leitura têm limitações de privacidade descritas nas pendências.

## Arquivos alterados e criados

| Arquivo | Alteração |
| --- | --- |
| `.gitignore` | Novo: ambientes privados, dependências, builds, logs, caches e arquivos locais |
| `.env.example` | Novo: todas as variáveis de configuração, sem valores privados |
| `README.md` | Corrige descrição da integração, fecha bloco de código e documenta execução/verificação |
| `package.json` | Adiciona `npm test`, usando o runner nativo do Node |
| `server/src/lib/environment.js` | Novo: carrega `.env` da raiz e centraliza a leitura obrigatória de JWT_SECRET |
| `server/indice.js` | Importa carregamento de ambiente antes de determinar a porta |
| `server/src/aplicativo.js` | Valida a configuração JWT antes de iniciar a API |
| `server/src/intermediario/autenticacao.js` | Remove segredo JWT de fallback |
| `server/src/rotas/autenticacao.rotas.js` | Usa a mesma configuração JWT da verificação |
| `server/src/rotas/treinamentos.rotas.js` | Calcula avaliação uma vez para create/update do upsert |
| `prisma/seed.js` | Substitui senha fixa por SEED_PASSWORD e recusa senha ausente |
| `src/principal.jsx` | Remove registro de service worker inexistente; preserva registro pelo plugin |
| `index.html` | Remove link de manifest duplicado, já injetado pelo plugin no build |
| `vite.config.js` | Substitui referências a assets ausentes pelo logo existente |
| `src/paginas/treinador/AtletasTreinador.jsx` | Move retorno sem equipe para depois dos hooks |
| `src/paginas/treinador/ConfigsTreinador.jsx` | Remove bindings de catch sem uso; explicita variável descartada do rest |
| `src/paginas/atleta/PainelAtleta.jsx` | Remove import de CSS vazio |
| `src/data/seedData.js` | Remove passwordHint sem referências, que descrevia incorretamente o login local |
| `tests/api.test.js` | Novo: testes de JWT, health, permissões básicas e proteção do seed |
| `Documentação/revisao-tecnica.md` | Novo: este relatório |

### Arquivos removidos

Todos estavam vazios. As referências estáticas, chamadas dinâmicas,
configurações e imports CSS foram pesquisados antes da exclusão:

- `src/styles/paginasAtleta/AthleteDashboard.css` — removido também seu único import.
- `src/styles/paginasAtleta/AthleteLobby.css`.
- `src/styles/paginasAtleta/TeamSearch.css`.
- `src/styles/paginasTreinador/AthletesPage.css`.
- `src/styles/paginasTreinador/TrainingsPage.css`.

O CSS compilado permaneceu idêntico ao build anterior à limpeza
(`index-Cn6DewR4.css`). Não foram removidos estilos ativos nem reformatação global.
Logs de inicialização e de erros foram mantidos por terem função operacional.

## Dependências

Nenhuma removida, adicionada ou atualizada. `package-lock.json` foi preservado,
e suas dependências coincidem com `package.json`. `npm ls --depth=0` passou.
React, React DOM, Lucide, Recharts, Express, CORS, bcrypt, JWT, Prisma, Vite,
plugin React e plugin PWA têm referências diretas em código/configuração.
Terser foi mantido: está no ecossistema de build Vite/Workbox, inclusive na
cadeia transitiva de geração do service worker. Não foi tratado como abandono.

## Variáveis de ambiente

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Datasource MySQL do Prisma |
| `JWT_SECRET` | Assinatura/verificação JWT; obrigatória para iniciar a API |
| `PORT` | Porta da API; padrão 3333 |
| `VITE_API_URL` | Base pública do serviço HTTP frontend; padrão localhost:3333/api |
| `SEED_PASSWORD` | Somente seed; senha das contas de demonstração a criar |

Foi encontrado apenas `.env` entre os arquivos de ambiente desta cópia, fora
de dependências/builds. Ele contém DATABASE_URL, JWT_SECRET e PORT, foi preservado
e seus valores não foram incluídos no exemplo, no relatório ou no código.
`import.meta.env.PROD` é uma constante do Vite, não uma variável a preencher.
O carregamento explícito usa o suporte nativo do Node; o README orienta Node 22.12+.

Para rodar o seed será necessário preencher SEED_PASSWORD no ambiente privado.
O seed mantém `skipDuplicates`: não altera senhas das contas já existentes.

## Segurança e GitHub

- Removidos a chave JWT previsível de fallback e o password literal do seed.
  Se contas foram criadas com a senha antiga, substitua suas senhas antes de
  usar esse banco fora de uma demonstração. Alterar o seed não as atualiza.
- O `.env` contém configuração privada de banco e JWT e deve permanecer local.
  `.gitignore` cobre `.env`, `.env.*`, node_modules e dist, permitindo `.env.example`.
- Buscas no código e documentação não identificaram outras chaves privadas,
  padrões comuns de tokens pessoais ou URLs de banco com credenciais hardcoded.
  Essa busca não equivale a uma auditoria exaustiva de todos os formatos de segredo.
- Senhas cadastradas no frontend ainda ficam em texto simples no LocalStorage.
  Nenhuma proteção no `.gitignore` resolve esse risco em tempo de execução.
- Esta pasta não é um repositório Git. `git status` e `git diff --stat` não puderam
  verificar índice/histórico. Foram usados `git diff --no-index` contra uma cópia
  temporária dos arquivos anteriores às edições e comparação de arquivos para
  conferir o escopo. O retorno 1 do diff significa diferenças encontradas.
- Não foi possível confirmar se `.env` ou node_modules já foram versionados,
  nem se credenciais aparecem no histórico de outro repositório. No repositório
  original, confira o rastreamento antes do commit. Se uma credencial privada
  já foi commitada, considere-a exposta e substitua-a; adicionar ignore não basta.
- Não houve push, commit, reset, clean ou publicação. Nenhum arquivo novo acima
  de 1 MB foi adicionado. Builds regenerados ficam em dist, coberto pelo ignore.

## Verificações executadas

| Verificação | Resultado e limite |
| --- | --- |
| Dependências existentes / `npm ls --depth=0` | Aprovado; sem reinstalação ou atualização desnecessária |
| `npm run build` | Aprovado após executar com acesso requerido pelo esbuild; primeira tentativa limitada pelo sandbox |
| `npm test` | 2 testes aprovados: health, ausência/invalidade/expiração de JWT, assinatura errada, perfil atleta impedido de escritas e seed sem senha |
| `npx --no-install prisma validate` | Aprovado |
| `npm run prisma:generate` | Aprovado; nenhum schema/migration aplicado |
| `npm run api`, porta temporária 3334 | API iniciou; health 200 e login inexistente 401 |
| Prisma/MySQL `SELECT 1` | Aprovado, somente leitura |
| Sintaxe, imports locais e bindings JS/JSX | 40 arquivos analisados; sem imports ausentes ou bindings não usados sem marcação de descarte |
| Referências aos arquivos removidos | Nenhuma restante |
| CSS | 13 arquivos analisados; cascata e seletores repetidos preservados |
| Navegador, preview isolado na porta 4174 | Cadastro fictício, login, logout, criação de equipe, painel e página sem atletas aprovados passaram; login repetido no build final |
| Responsividade | Tela de login verificada em 375 px, sem overflow horizontal; não é uma auditoria visual de todas as telas |
| Lint | Não configurado; análise estática acima não substitui ESLint |
| Testes de escrita reais no MySQL | Não executados, para preservar os dados existentes |

Avisos mantidos: chunk JavaScript de aproximadamente 605 kB e configuração
`package.json#prisma` depreciada para uma futura versão principal. O navegador
validou o modo local; não validou integração frontend/API, que está ausente.
O teste do seed executa apenas o caminho de recusa antes de qualquer escrita.

## Pendências e melhorias futuras preservadas

Estas não foram corrigidas automaticamente porque exigem definir regras,
compatibilidade ou mudanças funcionais além da limpeza:

1. **Integração e autenticação:** App e hook não utilizam login/CRUD da API.
   Contas iniciais do frontend não têm password, portanto não conseguem login
   local em armazenamento novo. Migrar para JWT/estado do servidor exige um
   plano para os dados locais e os fluxos offline; não basta trocar uma chamada.
2. **Privacidade nas leituras da API:** listagem de equipes e payload de sessão
   consultam todas as equipes e incluem atletas aprovados. Treinos retornam
   registros de outros atletas da equipe. A autorização precisa ser definida
   e aplicada à consulta/serialização antes de usar dados pessoais reais.
3. **Configurações incompletas:** a página chama `updateTeam`, `deleteTeam`,
   `addCriterion`, `removeCriterion` e `renameCriterion`, ausentes no hook.
   Esses botões podem falhar; implementar critérios requer definir como seus
   nomes afetam históricos, métricas e as quatro notas fixas do backend.
4. **Offline/React:** enfileiramento e setSyncQueue ocorrem dentro de funções
   atualizadoras de setState, que podem executar mais de uma vez no StrictMode
   de desenvolvimento. A fila não faz replay, não valida sua forma e cresce
   sem limpeza. Implementar sincronização requer idempotência e tratamento de conflitos.
5. **Validações backend:** normalizeRole converte perfis desconhecidos em
   treinador; normalizeStatus converte status desconhecidos em PENDING,
   tornando a verificação posterior ineficaz. Entradas malformadas podem virar
   erro 500; conversões de presença/notas e referências de atletas merecem validação.
6. **Contratos com diferenças locais:** join na API recoloca vínculo aprovado
   em PENDING; o modo local o preserva. PATCH de vínculo limpa número/posição
   quando omitidos. A busca local mostra código com trim, mas requestJoin não
   aplica trim. A modalidade Volei/Vôlei também não é consistente em todas as partes.
7. **Notas e critérios:** `Number(value) || 5` converte nota zero em cinco no
   backend; mais de quatro critérios qualitativos não cabem nas quatro colunas
   de Evaluation. Há diferenças de acentuação nos rótulos. Alterar essa regra
   exige confirmar o resultado esperado e a compatibilidade dos dados.
8. **Integridade e concorrência:** atualização de avaliação e métricas não
   é uma transação única. Código de equipe tem apenas 900 combinações; criação
   local pode repetir e backend pode concorrer ou esgotar o espaço. TrainingRecord
   guarda athleteId sem relação com User; exclusão de conta pode deixar histórico órfão.
9. **Erros e recuperação:** ErrorFallback aponta para `/reset.html`, ausente.
   Definir recuperação exige decidir quais dados locais podem ser removidos.
   Não foi criado reset que apagasse contas/treinos silenciosamente.
10. **Operação:** restringir CORS, rever duração/revogação JWT, respostas de
    conflito do Prisma, encerramento de conexões, exportação CSV com valores
    interpretáveis como fórmulas e uma suíte completa com banco isolado.
11. **CSS e manutenção:** PainelAtleta.css e PerfilAtleta.css não têm imports,
    mas foram mantidos por conter estilos completos. Há sobreposição entre CSS
    global e de páginas; deduplicar seletores exige comparar a cascata por tela
    e breakpoint. Divisão do bundle, lint e migração da configuração Prisma
    podem ser tratados separadamente.

Prioridade das próximas decisões: autenticação/integridade dos dados locais,
privacidade da API e funções de configuração ausentes. A revisão não declara
o projeto pronto para produção nem confirma histórico Git sem acesso ao repositório.
