# Privacidade, documentos legais e decisões — WebKore

Implementação local de 20/11/2026. Documentos preliminares; não constitui certificação de conformidade com a LGPD. O usuário determinou que o cadastro de atletas continue disponível em todas as idades.

## Auditoria anterior às alterações

Foram examinados o cadastro React, perfil, navegação por hash, cliente HTTP, restauração de sessão, JWT, middleware de autenticação, rotas de autenticação/equipes/treinos, serializadores, projeções de acesso, schema e migrations, CSV, armazenamento local, logs, segurança e exemplo de implantação.

| Dados/operação | Armazenamento e destinatários observados | Finalidade e enquadramento pendente |
| --- | --- | --- |
| Nome, e-mail, perfil, iniciais/foto textual, nascimento do atleta e datas cadastrais | MySQL/User; titular e treinador de equipes vinculadas conforme projeções existentes. Senha não integra respostas públicas. | Conta e gestão esportiva solicitada: hipótese preliminar do art. 7º, V; validar relação contratual e capacidade/representação. |
| Senha e sessões | Hash bcrypt em User; identificador, usuário e expiração em AuthSession. JWT no localStorage do navegador. | Autenticação e segurança; justificar registros técnicos e sua retenção. |
| Equipes, códigos, modalidade, vínculos, estados, número e posição | MySQL/Team e Membership. Treinador acessa suas equipes; atleta seus próprios vínculos. Busca por código retorna identificação básica da equipe/treinador. | Gerenciamento de equipe; definir responsabilidades da instituição e controlador/operador. |
| Datas/tipos/descrições de treino, presença, métricas, notas, critérios, posição e estatísticas de goleiro | Training, TrainingRecord, Evaluation, SportMetric, EvaluationProfile, ProfileCriterion, EvaluationCriterion, GoalkeeperStats, TrainingMeasurement. Treinador responsável e próprio atleta segundo escopos existentes. | Acompanhamento e avaliação esportiva; validar fundamento específico. Campos livres podem receber dados sensíveis indevidamente; informações que revelem saúde exigem análise do art. 11. |
| CSV | Gerado no navegador do treinador; nome/ID, equipe, modalidade, data, presença, métricas, notas e contexto de avaliação. Sem serviço externo de envio no código. | Relatórios esportivos; validar destinatários e uso posterior. Arquivos já baixados escapam à exclusão pelo servidor. |
| Eventos técnicos | Logs de escrita em produção ou SECURITY_LOGS=1: horário, requestId, método, rota, status e userId quando autenticado. Limitação de requisições usa endereço de rede em memória. | Segurança e diagnóstico; fundamento, acesso e prazo dependem do operador. Não se adicionou IP/user-agent às decisões legais. |
| Documentos e decisões (novos) | MySQL/LegalDocument e LegalDecision. Documentos públicos; decisões somente do próprio titular. | Transparência e evidência das ações; validar fundamento e retenção. Aceite contratual não equivale a consentimento. |

Não foram identificados no código analisado cookies de rastreamento, analytics, anúncios, marketing, e-mail transacional ou integrações externas de armazenamento. Isso não atesta a configuração real da hospedagem ou de proxies. Não foi confirmada localização dos servidores, backups, transferência internacional, criptografia em repouso ou identidade dos fornecedores.

A API já verificava usuário, perfil, versão de autenticação e sessão persistida, com expiração padrão de 24 horas. Mantém CORS, limites, cabeçalhos de segurança e projeções sem senha. Solicitações pendentes de equipe são apresentadas de forma reduzida; as consultas do servidor ainda carregam campos cadastrais conforme a arquitetura existente. Não foi reescrito o controle de acesso esportivo.

A exclusão já existia na API para ambos os perfis, mas a interface a escondia do atleta. TrainingRecord.athleteId é um campo escalar sem FK para User: a exclusão original podia deixar registros esportivos órfãos. A implementação passa a excluí-los explicitamente, com cascata para avaliações e métricas, dentro da transação de encerramento. Não se executou limpeza retroativa de registros antigos.

## A. Arquivos

Criados:

| Arquivo | Propósito |
| --- | --- |
| shared/legalDocuments.js | Textos preliminares específicos da Política e dos Termos, com pendências explícitas. |
| server/src/lib/legal.js | Validação, seleção de versões vigentes, hash canônico, requisitos, decisões e estado dos consentimentos. |
| server/src/rotas/legal.rotas.js | Endpoints públicos e autenticados de documentos/decisões. |
| prisma/migrations/20261120010000_legal_decisions/migration.sql | Migration aditiva de duas tabelas, índices e FKs. |
| prisma/publish-legal.js | Publicação local transacional e imutável, com repetição segura. |
| src/componentes/ui/Privacidade.jsx | Modal nativo, leitura, escolhas separadas, links e gerenciamento no perfil. |
| src/paginas/DocumentoLegal.jsx | Páginas públicas e consulta de versões antigas. |
| src/styles/Privacy.css | Estilos responsivos com os tokens existentes. |
| tests/legal.test.js | Validação, hash, requisitos, idade e rejeição de adulterações. |
| tests/legal-integration-check.js | Cenários reais de HTTP/MySQL em banco descartável exclusivo. |
| tests/legal-browser-check.js | Modal, teclado, dimensões, páginas públicas, download e cadastro pelo navegador. |
| Documentação/privacidade-e-consentimentos.md | Auditoria, operação, testes e limitações. |

Alterados:

| Arquivo | Propósito |
| --- | --- |
| prisma/schema.prisma | Relação de User com decisões e modelos LegalDocument/LegalDecision. |
| server/src/aplicativo.js | Montagem do router legal. |
| server/src/rotas/autenticacao.rotas.js | Validação do cadastro, transação conta/decisões, estado legal nas respostas, exportação própria e exclusão de registros esportivos. |
| src/principal.jsx | Rotas públicas reais /privacidade e /termos, antes do aplicativo autenticado. |
| src/paginas/PaginaLogin.jsx | Substituição da autorização genérica pelo modal e envio das decisões. |
| src/paginas/MeuPerfil.jsx | Seção de privacidade e acesso efetivo à exclusão para atleta e treinador. |
| src/services/api.js | Métodos dos novos endpoints. |
| src/hooks/useWebKoreData.js e src/App.jsx | Conservação do estado legal da sessão e aviso de documentos pendentes com acesso ao perfil. |
| tests/athlete-components.test.js | Atualização da expectativa de exclusão disponível para atleta e presença da seção de privacidade. |
| tests/integration-check.js | Fixtures de cadastro com documentos vigentes e decisões separadas. |
| qa/ct20/run.mjs, harness.mjs, security-check.mjs e webkore.cases.mjs | Publicação dos documentos no banco isolado e adaptação dos cadastros ao novo contrato. |
| package.json | Comandos de publicação e testes de privacidade. |

Nenhum arquivo removido. server/indice.js já estava não rastreado antes desta tarefa e não foi alterado.

## B. Arquitetura e segurança

1. O cadastro consulta os documentos vigentes na API. Páginas públicas também consultam a mesma fonte; não há conteúdo fictício de fallback quando o banco falha.
2. O modal usa dialog.showModal(), com foco modal nativo, Escape, fechamento e retorno ao botão de abertura. Leitura tem rolagem interna, sem bloquear escolhas por posição da rolagem. A ciência da Política e o aceite dos Termos começam desmarcados.
3. O cliente envia legal com termsId, privacyId, acceptTerms e acknowledgePrivacy. Campos extras no cadastro ou na decisão são rejeitados; IDs, horários ou identidade de usuário não são aceitos do cliente para atribuir registros.
4. O servidor valida versões vigentes e valores booleanos exatos. Uma transação grava a conta e suas decisões. Falhar ao persistir as decisões reverte a conta. Cadastro com versão ultrapassada recebe 409 e o usuário pode atualizar os documentos no formulário. Não se registram aceites retroativos para contas antigas.
5. Documentos publicados contêm conteúdo JSON, tipo, versão, hash SHA-256 sobre JSON canônico (chaves ordenadas), data de publicação/vigência, resumo e requirementKey. A versão exata é recuperável pela FK da decisão; não se duplica a versão em outra coluna.
6. Em alterações editoriais, manter requirementKey conserva a suficiência da decisão anterior. Alterações materiais exigem nova chave. O servidor retorna pending na sessão e no perfil. Não bloqueia automaticamente o login, não presume aceite pelo uso e não exige nova ação para toda correção de texto.
7. Cada decisão é um evento acrescentado ao histórico. A API não possui edição ou exclusão de eventos. O ID de usuário vem exclusivamente de requireAuth. Nem treinadores podem escolher outro titular. Operadores com acesso direto ao MySQL continuam sendo agentes privilegiados; não há assinatura externa ou armazenamento inviolável.
8. Uma transação com SELECT ... FOR UPDATE na conta serializa decisões concorrentes. A chave (userId, requestKey) impede duplicação em reenvio. Cada nova chave é uma nova manifestação explícita; repetir a mesma chave retorna a decisão original, mesmo após uma decisão posterior. Reutilizar uma chave para payload diferente gera 409. A sequência numérica do banco ordena eventos, inclusive quando timestamps coincidem.
9. Consentimentos opcionais usam documentos do tipo CONSENT, uma finalidade identificada por purpose e ações GRANT, DECLINE, REVOKE. O estado é derivado dos eventos; não há tabela de estado duplicado. Novo requirementKey não herda concessões anteriores. Revogar uma concessão antiga continua possível. Uma tentativa tardia de repetir uma concessão antiga não reverte uma revogação mais recente.
10. Não existe finalidade opcional real no catálogo inicial. A estrutura de escolhas e revogação está implementada e testada com documentos fictícios SOMENTE no banco isolado. Não foram inventados publicidade, marketing ou autorizações de exportação. Antes de publicar uma finalidade real, é necessário implementar e testar o consumidor dessa autorização e revisar suas consequências. A CLI exige --allow-consent para essa publicação deliberada.
11. Menores não são bloqueados no cadastro esportivo. A concessão de consentimentos opcionais para atletas menores de 18 anos ou sem nascimento é rejeitada no servidor; recusa e revogação permanecem possíveis. Se uma correção de nascimento identificar um menor com concessões anteriores, a mesma transação acrescenta eventos REVOKE_AGE: voltar a informar idade adulta não reativa essas concessões. Isso não comprova idade nem resolve verificação de responsáveis. A data civil continua usando as regras existentes de São Paulo, sem aceitar datas impossíveis ou futuras.

Endpoints:

| Método e rota | Acesso e resultado |
| --- | --- |
| GET /api/legal/documents | Público; versões vigentes por tipo/finalidade. |
| GET /api/legal/documents/:type/:version | Público; versão publicada já vigente, inclusive antiga. |
| POST /api/auth/register | Público, limitado por rate limit; aceita decisões somente para a conta criada na própria transação. |
| GET /api/legal/me | Autenticado; documentos, histórico próprio, pendências e consentimentos derivados. |
| POST /api/legal/me/decisions | Autenticado; documentId, action, requestKey. Sem userId no payload. |
| GET /api/auth/me/data | Autenticado; JSON de dados cadastrais próprios, vínculos, equipes próprias em projeção reduzida, registros esportivos e decisões. |
| DELETE /api/auth/me | Autenticado; exclusão real da conta, seus vínculos, sessões, decisões e registros esportivos; treinador também remove suas equipes/treinos. |

A cópia pessoal não é um relatório de todos os dados cadastrados em equipes de terceiros nem certificação de portabilidade jurídica. Não inclui hashes, tokens ou cadastro de terceiros. As decisões continuam consultáveis em Meu Perfil; correção usa a edição real já existente. Não foi criado botão de solicitação sem destinatário ou entrega efetiva.

## C. Banco e publicação

- User 1:N LegalDecision; exclusão da conta faz cascade nas suas decisões.
- LegalDocument 1:N LegalDecision; exclusão do documento referenciado é restringida.
- LegalDocument é único por (type, version); índices permitem localizar vigência.
- LegalDecision tem sequência única autoincrementada, índice por usuário/data e chave única de idempotência por usuário.
- As decisões são preservadas enquanto a conta existe. Não há guarda posterior à exclusão; qualquer retenção obrigatória precisa de nova decisão institucional, prazo e implementação correspondente.

Comandos na raiz do projeto:

```powershell
npm run prisma:generate
npx prisma migrate deploy
npm run legal:publish
```

A migration foi aplicada ao MySQL local webkore nesta tarefa. É aditiva e não popula decisões para usuários existentes. O cliente Prisma foi gerado; a API local foi reiniciada para liberar o arquivo DLL bloqueado e carregar os modelos. Não houve publicação em produção ou serviço de hospedagem.

Para publicar outra versão, crie um JSON com a mesma estrutura dos objetos de shared/legalDocuments.js e execute:

```powershell
npm run legal:publish -- caminho/versoes.json
```

A CLI aceita objeto ou lista. Faz transação, não sobrescreve versão publicada, e rejeita alterações de conteúdo, metadados, vigência ou requisito de um ID existente. Repetir publicação idêntica não duplica linhas. Publicações futuras ficam armazenadas, mas só são servidas a partir da vigência; não há endpoint público de publicação. Cada versão precisa de identificador próprio, resumo e revisão humana de requirementKey. Para finalidades opcionais, usar purpose específico; mudança da finalidade exige nova chave, sem aproveitar consentimentos antigos. Publicar CONSENT requer também a flag --allow-consent e um consumidor de autorização implementado e testado; a flag não substitui essa implementação.

Os documentos locais passaram à versão 2026-11-20.2 com hash canônico; a publicação preliminar .1 realizada durante a implementação permanece no banco como histórico, sem sobrescrita.

Em hospedagem estática, configurar fallback de /privacidade e /termos para index.html, como já ocorre no exemplo de Nginx. A navegação do painel continua por hash. Em falha de banco os documentos mostram erro e tentativa real de atualização, sem exibir texto como se fosse versão oficialmente publicada.

## D. Verificações

Comandos reproduzíveis:

```powershell
npm test
npm run build
npm run test:build
npm run test:privacy
npm run test:privacy:browser
```

Os testes de privacidade recusam ambiente de produção e exigem URL MySQL local. Criam banco com nome aleatório exclusivo, aplicam todas as migrations e removem apenas esse banco no finally. Exigem permissão local para criar/remover banco. Não usam dados reais como fixtures. A opção browser usa Edge no Windows, ou Chromium nos demais sistemas; WEBKORE_TEST_BROWSER_CHANNEL permite selecionar outro canal instalado. Não usa o perfil pessoal do navegador.

Resultados finais efetivamente executados:

| Verificação | Resultado |
| --- | --- |
| node --test / npm test | 94 testes aprovados; zero falhas, zero ignorados. Inclui cinco novos testes de regras legais e a atualização do contrato de perfil do atleta. |
| node tests/legal-integration-check.js --browser | 24 cenários de HTTP/MySQL aprovados, além dos fluxos de navegador descritos abaixo. Banco exclusivo criado e removido ao final. |
| Modal no Microsoft Edge | 360, 390, 768, 1366 e 1920 px: limites da viewport, título legível, rolagem interna, escolhas inicialmente desmarcadas, ciência separada do aceite, circulação do foco por Tab e retorno ao botão com Escape. |
| Páginas públicas no Edge | Política nas cinco larguras, sem excesso horizontal; Termos acessíveis sem login. |
| Perfil no Edge | Histórico real carregado; arquivo JSON baixado e conteúdo conferido, com usuário correto e ausência de hash de senha. |
| Cadastro de criança no Edge | Formulário real com nascimento em 2020; recusa de envio sem decisões; envio válido e login automático no painel de atleta. Nenhum registro de autorização parental presumida. |
| Capturas | Dez PNGs em tmp/privacy-qa (modal e Política nas cinco larguras); inspeção visual das capturas de modal a 360 e 1366 px. |
| npm run build e npm run test:build | Aprovados. |
| prisma generate, prisma validate e prisma migrate status | Cliente gerado, schema válido e banco local atualizado. |
| Publicação repetida | Conferida no banco local; também testada com alteração rejeitada e repetição idêntica em banco isolado. |
| git diff --check | Aprovado; apenas avisos de conversão LF/CRLF do ambiente Windows. |

Os 24 cenários de integração verificam publicação imutável, leitura pública sem decisões automáticas, cadastro obrigatório/validação/persistência, duplicação de cadastro, autenticação e isolamento entre titulares, ausência de edição do histórico, reenvio concorrente, escolhas opcionais no cadastro, recusa sem bloqueio de login, concessão/revogação, reenvio antigo após revogação, mudança de finalidade, versões editoriais/materiais, nova Política, correção de idade, versões ultrapassadas, crianças e adolescentes, exportação sem cadastro alheio, rollback real, falha de conexão simulada e exclusão de registros esportivos/decisões/sessão.

Falhas intermediárias foram corrigidas antes da execução final aprovada: a resposta de cadastro/login inicialmente não incluía legal; a navegação por Tab podia sair do modal; o CSS global de button comprimia o título do modal; a configuração inicial do navegador de testes não tinha Chromium instalado e precisou usar Edge com porta/origem/cache exclusivos; seletores e reinicialização de sessão do teste foram ajustados. Não se marcou essas execuções intermediárias como aprovadas.

Não executados: suíte CT20 completa, scripts gerais de integração esportiva/posições (seus auxiliares foram adaptados ao contrato de cadastro, mas não certificados por esta execução), leitor de tela real, dispositivos móveis físicos, validação por titulares/crianças/responsáveis, auditoria da infraestrutura de produção, recuperação de backups, testes de carga e avaliação jurídica. A falha de conexão é injetada no método de consulta para verificar tratamento HTTP; não se desligou o MySQL do usuário. A falha de gravação é injetada dentro de uma transação MySQL real, cuja reversão é conferida por consulta.

## E. Pendências institucionais e jurídicas

1. Identificar controlador, operadores, relação com as equipes, qualificação, endereço e canal efetivo para titulares. O repositório não permite deduzir esses dados.
2. Validar bases legais por finalidade, inclusive segurança/logs, avaliação esportiva, compartilhamento com treinadores e CSV. O consentimento não é base universal; o contrato não é presumido suficiente em qualquer contexto.
3. Para menores, avaliar melhor interesse em cada finalidade e faixa etária, capacidade de representação, necessidade de consentimento específico de responsável e forma verificável de identificação/vínculo, minimização, transparência apropriada e eventual avaliação de impacto. A escolha de permitir todas as idades não resolve essas obrigações. Não existe autorização parental verificada nesta entrega.
4. Definir política de retenção, logs, backups, evidências legais e pedidos de exclusão/anonimização. Não inventar prazos; hoje não há rotina automática de expurgo nem guarda de decisões após encerramento da conta.
5. Identificar hospedagem, fornecedores e países; avaliar eventuais transferências e mecanismos aplicáveis. Confirmar HTTPS, segredos, acessos, backups, resposta a incidentes e segurança operacional.
6. Definir atendimento dos direitos que exigem intervenção humana, responsáveis e entrega comprovada. Cópia JSON e exclusão próprias são operações efetivas; não substituem integralmente o atendimento institucional.
7. Revisar Termos/Política antes de disponibilização a terceiros, sobretudo considerando que campos essenciais ainda estão pendentes. Não coletar dados sensíveis em descrições/critérios sem finalidade e enquadramento apropriados.

Referências consultadas em 20/11/2026: [LGPD — texto legal](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) e [orientação da ANPD sobre crianças e adolescentes](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-divulga-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes). As referências sustentam a necessidade de analisar hipóteses legais e melhor interesse; não aprovam automaticamente o uso institucional desta plataforma.

## F. Escopo e limitações

**Implementado:** documentos públicos e históricos, publicação imutável por CLI, metadados/hash, cadastro validado no servidor, gravação transacional, distinção entre ciência/contrato/consentimento, decisões por titular, histórico, requisitos de nova versão, idempotência, serialização de concorrência, estado derivado dos consentimentos, concessão/recusa/revogação, perfil, download próprio, exclusão efetiva de atleta/treinador e proteções técnicas descritas para menores.

**Parcial/dependente de implantação:** catálogo genérico de consentimentos sem finalidade opcional real nem consumidor de processamento opcional; política de menores com cadastro preservado e concessões opcionais restritas, mas sem verificação parental; documentos preliminares com identificação/canal/bases/retenção ainda a validar; operação de direitos parcialmente autônoma e parcialmente institucional. Nenhuma simulação é apresentada como autorização de responsável ou pedido entregue.

**Não implementado:** validação documental de idade/identidade, contas/vínculos de responsáveis, anonimização, expurgo programado, exclusão de backups/arquivos exportados, painel administrativo de publicação/suspensão, recuperação de senha, e-mail de atendimento ou mecanismo externo de evidência inviolável. A aplicação não pode impedir que operadores privilegiados alterem diretamente o banco. O legado TrainingRecord.athleteId continua sem FK; a correção cuida da exclusão de conta, sem migrar ou resolver retroativamente todos os registros órfãos preexistentes.

**Validação jurídica obrigatória:** conteúdo e responsabilidade institucional, bases por finalidade, menores e melhor interesse, dados sensíveis, transferências, retenção, capacidade de contratação/representação e mecanismos de atendimento. Não se declara o WebKore 100% adequado à LGPD.
