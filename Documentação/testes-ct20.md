# WebKore — 20 casos automatizados

Execução UTC: 2026-11-19T00:33:29.751Z.
Resultado: 20/20 aprovados.
Navegador: msedge headless.
Isolamento: Banco exclusivo webkore_ct20_a16da0f2aa4448e88baeaa6476a8c61f; API, JWT e portas independentes.
Limpeza: Banco temporário removido e ausência confirmada no MySQL. Banco original não consultado nem alterado.

## Análise e execução

O projeto utiliza React/Vite, Express, Prisma/MySQL e JWT. Os testes existentes com node:test foram preservados. A suíte CT20 acrescenta Playwright para usar a interface real, requisições HTTP e consultas ao banco temporário, além de funções unitárias reais de avaliação.

Execute `npm run test:ct20`. O executor cria um banco exclusivo com nome aleatório, inicializa o schema e a API e sobe o Vite em portas livres. Não usa a API nem o frontend em execução do usuário. Cada caso cria contas fictícias próprias e faz sua limpeza; o banco criado nesta execução é removido no finally. Uma falha de isolamento interrompe os testes sem recorrer ao banco principal.

O navegador usa um perfil temporário. Chromium é o padrão; instale-o com `npm run test:ct20:install`. Para um navegador já instalado, use WEBKORE_TEST_BROWSER_CHANNEL=msedge ou chrome. WEBKORE_TEST_DATABASE_URL pode fornecer a conexão de um servidor MySQL de testes; o executor sempre cria outro banco novo nesse servidor. Na ausência dessa variável, usa somente a conexão administrativa do servidor configurado em DATABASE_URL para criar e remover o banco temporário, sem consultar ou alterar as tabelas do banco principal.

## Resultados

| ID | Funcionalidade | Resultado esperado | Resultado obtido | Status |
|---|---|---|---|---|
| CT-01 | Cadastro de usuário | Contas persistidas com perfis e nascimento corretos, senha com hash e sem hash na resposta. | Treinador e atleta persistidos no MySQL; nascimento, perfis e hash bcrypt conferidos; resposta sem hash. | Aprovado |
| CT-02 | Login automático após cadastro | JWT válido e área inicial correspondente a cada perfil, sem repetir credenciais. | Formulário real cadastrou os dois perfis, persistiu JWT validado pela API e abriu automaticamente a área correta. | Aprovado |
| CT-03 | Credenciais inválidas | Login rejeitado, nenhum token persistido e recurso protegido responde 401. | Senha errada, perfil incorreto e conta inexistente responderam 401; UI exibiu erro, sem token nem acesso protegido. | Aprovado |
| CT-04 | Persistência e encerramento da sessão | Reload preserva sessão; logout remove token e bloqueia UI. JWT copiado permanece válido até expirar ou invalidar a conta, pois não existe revogação individual. | Reload restaurou a sessão; logout limpou o navegador e bloqueou UI. Token copiado continuou válido conforme JWT sem blacklist; expiração e exclusão da conta foram rejeitadas com 401. | Aprovado |
| CT-05 | Perfil pessoal independente | Perfil correto sem teamId; edição própria persistida; nenhum dado da outra conta exposto. | Treinador e atleta sem equipe abriram #/perfil, editaram só a própria conta e mantiveram dados após reload; menu ativo e conta alheia intacta. | Aprovado |
| CT-06 | Criação de equipe | Equipe real criada com código de acesso e coachId correto. | Equipe criada pela interface, listada pela API e vinculada ao treinador no MySQL, com código de acesso. | Aprovado |
| CT-07 | Entrada por código | Um único vínculo PENDING; código inválido rejeitado sem novo vínculo. | Código válido com espaços criou um vínculo PENDING; repetição não duplicou; código inexistente retornou 404. | Aprovado |
| CT-08 | Aprovação e rejeição | Status persistidos; somente atleta aprovado acessa treinos da equipe. | APPROVED e REJECTED persistidos; somente vínculo aprovado autorizado a consultar treinos. | Aprovado |
| CT-09 | Permissões entre equipes | Todas as tentativas negadas e registros alheios intactos. | Leitura, edição, avaliação e exclusões cruzadas retornaram 404; equipe e presença alheias permaneceram intactas. | Aprovado |
| CT-10 | Saída de equipe | Vínculo removido, histórico preservado e acesso anterior revogado. | Vínculo excluído; presença e avaliação histórica idênticas no banco; acesso do atleta aos treinos revogado. | Aprovado |
| CT-11 | Criação de treino | Treino e registros persistidos na equipe correta; criação inválida não deixa registros parciais. | Treino e três registros associados corretamente; atleta externo, data inexistente e tipo inválido rejeitados sem criação parcial. | Aprovado |
| CT-12 | Registro de presença | Booleanos persistidos, notas históricas preservadas e avaliações novas de ausente rejeitadas. | Presença e ausência persistidas; nota histórica preservada; novas notas de ausente e presença não booleana rejeitadas. | Aprovado |
| CT-13 | Nota inicial automática | Notas iniciais 5 visíveis; nenhuma avaliação no banco antes de revisão e salvamento. | Linha e goleiro exibiram quatro notas 5 como rascunho; salvar permaneceu desabilitado e banco sem avaliação; zero salvo não foi substituído. | Aprovado |
| CT-14 | Edição e salvamento | Notas e medidas persistidas, médias 5,75 e 5,25, ausência sem nota nova e dados preservados no reload. | Salvamento real persistiu dois atletas (médias 5,75 e 5,25), Gols=3, Defesas=2 e terceiro ausente sem avaliação; reload recuperou os valores. | Aprovado |
| CT-15 | Expansão e fechamento | Expansão e recolhimento corretos; campos não fecham painel; rascunho preservado e URL válida. | Dois treinos abriram/recolheram, campos não fecharam painel, rascunho 8 foi preservado sem gravação e Voltar/Avançar/mobile mantiveram URLs válidas. | Aprovado |
| CT-16 | Linha e Goleiro | Cada atleta recebe somente seus critérios; API rejeita critério incompatível sem gravar. | Critérios qualitativos e quantitativos personalizados de Linha/Goleiro ficaram separados; critério cruzado rejeitado com 400 e sem gravação. | Aprovado |
| CT-17 | Quantitativos opcionais | Sem porcentagens inventadas: dados ausentes ou denominador zero produzem null; zero observado é preservado. | Campos ausentes/null e denominador zero mantiveram null; zero observado permaneceu zero; percentuais válidos foram 80% e 50%, com PATCH parcial preservando outros campos. | Aprovado |
| CT-18 | Médias e desempenho | Média coletiva 8, presença 50%, soma observada 5 e ponderação histórica preservada. | Dados reais produziram média coletiva 8, três avaliações, presença 50% e Gols=5; interface exibiu 8,0/10 e 50%; fórmula ponderada histórica conferida. | Aprovado |
| CT-19 | Proteção de rotas e IDs | 401/403/404 conforme contrato, UI bloqueada e identidades/recursos intactos. | Acesso anônimo/adulterado, escalada de perfil, IDs manipulados e recursos sem vínculo foram bloqueados; API não expôs e-mails alheios e UI negou rota administrativa. | Aprovado |
| CT-20 | Navegação e responsividade | Sem erro de JavaScript, overflow horizontal ou textos de cards cortados; menu e destinos utilizáveis. | Navegação real e reload conferidos em mobile/tablet/desktop (360, 768, 1366 e 1920 px), nos dois perfis; sem erros JavaScript, overflow, cards cortados ou alvos de menu abaixo de 44 px. | Aprovado |

## Regras e limites

- CT-04 respeita o mecanismo existente: logout remove o token do navegador. Não há blacklist/revogação individual de JWT no servidor. O teste comprova que um token copiado continua válido até expirar ou invalidar a conta; não trata isso como revogação inexistente nem altera a autenticação.
- CT-13 distingue rascunho automático de nota persistida: 5 só é gravado após confirmação e salvamento.
- As medições de CT-20 cobrem os tamanhos listados em Chromium/Edge/Chrome conforme o canal escolhido. Não equivalem a uma matriz completa de navegadores ou dispositivos.
- Falhas geram saída não zero; não há retries nem resultados esperados rebaixados. Evidências de navegador (captura e trace em falhas) ficam em test-results/ct20.

## Diagnóstico e correções

Na primeira execução, CT-02 usava um nome acessível exato que excluía o texto auxiliar do campo de nascimento, e CT-14 procurava um status global em uma página com dois status. Os seletores foram corrigidos para o campo correto e para a área de salvamento, mantendo todas as asserções funcionais. A referência obsoleta a PositionRankings na página antiga tests/position-ui.jsx foi substituída pelo componente atual AverageRankings. Não foi necessário alterar cálculos ou regras de negócio.

## Pendências de dependências

A auditoria npm, separada dos 20 casos funcionais, registrou 13 alertas na árvore existente: 1 crítico(s), 9 alto(s), 2 moderado(s) e 1 baixo(s).
Pacotes: @prisma/config (high), baseline-browser-mapping (moderate), body-parser (high), browserslist (high), deepmerge-ts (high), esbuild (low), nanoid (high), postcss (high), prisma (high), proxy-addr (critical), qs (moderate), source-map-js (high), vite (high).
Esses alertas permanecem como pendência para revisão e atualização das dependências antes da implantação. As atualizações de runtime não foram incluídas nesta implementação de testes. O resultado bruto está em test-results/ct20/dependency-audit.json; nenhum dos três pacotes adicionados com Playwright aparece nessa lista de alertas.

## Especificação dos casos

### CT-01 — Cadastro de usuário

- Camada: API + MySQL
- Objetivo: Cadastrar treinador e atleta com dados válidos.
- Pré-condições: Banco isolado vazio para as contas fictícias.
- Entrada: Nomes CT20, e-mails únicos example.invalid, senha fictícia e nascimento válido.
- Passos: Enviar cadastros; consultar os usuários no MySQL; comparar dados e hash.
- Esperado: Contas persistidas com perfis e nascimento corretos, senha com hash e sem hash na resposta.
- Obtido: Treinador e atleta persistidos no MySQL; nascimento, perfis e hash bcrypt conferidos; resposta sem hash.
- Status: Aprovado

### CT-02 — Login automático após cadastro

- Camada: Ponta a ponta
- Objetivo: Autenticar e redirecionar os dois perfis sem outro login.
- Pré-condições: Navegador sem sessão e e-mails novos.
- Entrada: Cadastro de treinador e atleta pelo formulário real.
- Passos: Preencher cadastro; aceitar consentimento; enviar; verificar URL, token e /auth/me.
- Esperado: JWT válido e área inicial correspondente a cada perfil, sem repetir credenciais.
- Obtido: Formulário real cadastrou os dois perfis, persistiu JWT validado pela API e abriu automaticamente a área correta.
- Status: Aprovado

### CT-03 — Credenciais inválidas

- Camada: Interface + API
- Objetivo: Impedir login com senha incorreta ou perfil diferente.
- Pré-condições: Conta fictícia válida e navegador sem token.
- Entrada: Senha errada, e-mail inexistente e perfil incompatível.
- Passos: Tentar login; verificar erro e armazenamento; acessar recurso protegido sem token.
- Esperado: Login rejeitado, nenhum token persistido e recurso protegido responde 401.
- Obtido: Senha errada, perfil incorreto e conta inexistente responderam 401; UI exibiu erro, sem token nem acesso protegido.
- Status: Aprovado

### CT-04 — Persistência e encerramento da sessão

- Camada: Ponta a ponta + API
- Objetivo: Restaurar sessão no reload e encerrar o acesso local no logout.
- Pré-condições: Conta fictícia autenticada por login real.
- Entrada: JWT válido, token expirado e token de conta excluída.
- Passos: Recarregar perfil; sair; voltar à URL protegida; conferir rejeição de tokens inválidos.
- Esperado: Reload preserva sessão; logout remove token e bloqueia UI. JWT copiado permanece válido até expirar ou invalidar a conta, pois não existe revogação individual.
- Obtido: Reload restaurou a sessão; logout limpou o navegador e bloqueou UI. Token copiado continuou válido conforme JWT sem blacklist; expiração e exclusão da conta foram rejeitadas com 401.
- Status: Aprovado

### CT-05 — Perfil pessoal independente

- Camada: Ponta a ponta + API
- Objetivo: Exibir e editar somente a própria conta sem equipe.
- Pré-condições: Treinador e atleta sem equipes; outra conta privada existente.
- Entrada: Rota #/perfil e alteração do próprio nome.
- Passos: Abrir perfil; verificar menu ativo e ausência de equipe/conta alheia; salvar e recarregar.
- Esperado: Perfil correto sem teamId; edição própria persistida; nenhum dado da outra conta exposto.
- Obtido: Treinador e atleta sem equipe abriram #/perfil, editaram só a própria conta e mantiveram dados após reload; menu ativo e conta alheia intacta.
- Status: Aprovado

### CT-06 — Criação de equipe

- Camada: Ponta a ponta + MySQL
- Objetivo: Vincular a equipe criada ao treinador autenticado.
- Pré-condições: Treinador sem equipes.
- Entrada: Nome Equipe CT20 e modalidade Futsal.
- Passos: Criar equipe pelo formulário; conferir card, API e proprietário no banco.
- Esperado: Equipe real criada com código de acesso e coachId correto.
- Obtido: Equipe criada pela interface, listada pela API e vinculada ao treinador no MySQL, com código de acesso.
- Status: Aprovado

### CT-07 — Entrada por código

- Camada: API + MySQL
- Objetivo: Criar solicitação pendente por código válido.
- Pré-condições: Equipe existente e atleta sem vínculo.
- Entrada: Código válido com espaços e código inexistente.
- Passos: Solicitar entrada; repetir solicitação; consultar vínculo; enviar código inválido.
- Esperado: Um único vínculo PENDING; código inválido rejeitado sem novo vínculo.
- Obtido: Código válido com espaços criou um vínculo PENDING; repetição não duplicou; código inexistente retornou 404.
- Status: Aprovado

### CT-08 — Aprovação e rejeição

- Camada: API + MySQL
- Objetivo: Aplicar corretamente as duas decisões do treinador.
- Pré-condições: Duas solicitações pendentes.
- Entrada: APPROVED para um atleta e REJECTED para outro.
- Passos: Responder às solicitações; consultar banco e sessões dos atletas.
- Esperado: Status persistidos; somente atleta aprovado acessa treinos da equipe.
- Obtido: APPROVED e REJECTED persistidos; somente vínculo aprovado autorizado a consultar treinos.
- Status: Aprovado

### CT-09 — Permissões entre equipes

- Camada: API + MySQL
- Objetivo: Isolar equipes de dois treinadores.
- Pré-condições: Dois treinadores, cada qual com equipe e treino.
- Entrada: IDs reais da equipe e do treino alheios.
- Passos: Tentar leitura, edição, exclusão e avaliação cruzadas; reler o banco.
- Esperado: Todas as tentativas negadas e registros alheios intactos.
- Obtido: Leitura, edição, avaliação e exclusões cruzadas retornaram 404; equipe e presença alheias permaneceram intactas.
- Status: Aprovado

### CT-10 — Saída de equipe

- Camada: API + MySQL
- Objetivo: Remover vínculo preservando histórico esportivo.
- Pré-condições: Atleta aprovado com presença e avaliação salvas.
- Entrada: DELETE do próprio vínculo.
- Passos: Sair; verificar vínculo, registros e sessão; tentar ler treinos novamente.
- Esperado: Vínculo removido, histórico preservado e acesso anterior revogado.
- Obtido: Vínculo excluído; presença e avaliação histórica idênticas no banco; acesso do atleta aos treinos revogado.
- Status: Aprovado

### CT-11 — Criação de treino

- Camada: API + MySQL
- Objetivo: Associar treino e participantes à equipe autorizada.
- Pré-condições: Treinador e três atletas aprovados.
- Entrada: Data civil, tipo, descrição e IDs de participantes.
- Passos: Cadastrar treino válido; comparar banco; tentar atleta externo e campos inválidos.
- Esperado: Treino e registros persistidos na equipe correta; criação inválida não deixa registros parciais.
- Obtido: Treino e três registros associados corretamente; atleta externo, data inexistente e tipo inválido rejeitados sem criação parcial.
- Status: Aprovado

### CT-12 — Registro de presença

- Camada: API + MySQL
- Objetivo: Persistir presença e ausência sem apagar avaliação histórica.
- Pré-condições: Treino com avaliação de um participante.
- Entrada: Alternâncias true/false e valor inválido.
- Passos: Alterar presença; reler API/banco; verificar avaliação anterior; rejeitar nova nota de ausente.
- Esperado: Booleanos persistidos, notas históricas preservadas e avaliações novas de ausente rejeitadas.
- Obtido: Presença e ausência persistidas; nota histórica preservada; novas notas de ausente e presença não booleana rejeitadas.
- Status: Aprovado

### CT-13 — Nota inicial automática

- Camada: Interface + MySQL
- Objetivo: Mostrar 5 como rascunho sujeito à revisão, sem gravar automaticamente.
- Pré-condições: Treino sem avaliações com perfis Linha e Goleiro.
- Entrada: Critérios reais configurados na equipe.
- Passos: Abrir treino e cada participante; conferir quatro notas 5, botão desabilitado e banco.
- Esperado: Notas iniciais 5 visíveis; nenhuma avaliação no banco antes de revisão e salvamento.
- Obtido: Linha e goleiro exibiram quatro notas 5 como rascunho; salvar permaneceu desabilitado e banco sem avaliação; zero salvo não foi substituído.
- Status: Aprovado

### CT-14 — Edição e salvamento

- Camada: Ponta a ponta + MySQL
- Objetivo: Salvar notas, medidas e presença de vários atletas.
- Pré-condições: Treino com dois atletas presentes e terceiro a marcar ausente.
- Entrada: Notas 8 e 6 em um critério, demais 5; Gols=3, Defesas=2; terceiro ausente.
- Passos: Editar e confirmar dois atletas; marcar ausência; salvar; consultar banco; recarregar.
- Esperado: Notas e medidas persistidas, médias 5,75 e 5,25, ausência sem nota nova e dados preservados no reload.
- Obtido: Salvamento real persistiu dois atletas (médias 5,75 e 5,25), Gols=3, Defesas=2 e terceiro ausente sem avaliação; reload recuperou os valores.
- Status: Aprovado

### CT-15 — Expansão e fechamento

- Camada: Ponta a ponta
- Objetivo: Alternar dois treinos preservando rascunhos e navegação.
- Pré-condições: Dois treinos existentes; desktop e mobile.
- Entrada: Cliques no cabeçalho, Recolher treino e campos internos.
- Passos: Abrir, editar rascunho, fechar/reabrir; abrir outro; testar Voltar/Avançar e mobile.
- Esperado: Expansão e recolhimento corretos; campos não fecham painel; rascunho preservado e URL válida.
- Obtido: Dois treinos abriram/recolheram, campos não fecharam painel, rascunho 8 foi preservado sem gravação e Voltar/Avançar/mobile mantiveram URLs válidas.
- Status: Aprovado

### CT-16 — Linha e Goleiro

- Camada: Interface + API
- Objetivo: Aplicar critérios específicos de cada posição.
- Pré-condições: Equipe com perfis configurados e participantes Ala/Goleiro.
- Entrada: Critérios personalizados distintos por perfil.
- Passos: Configurar critérios; abrir cada participante; tentar usar critério do outro perfil.
- Esperado: Cada atleta recebe somente seus critérios; API rejeita critério incompatível sem gravar.
- Obtido: Critérios qualitativos e quantitativos personalizados de Linha/Goleiro ficaram separados; critério cruzado rejeitado com 400 e sem gravação.
- Status: Aprovado

### CT-17 — Quantitativos opcionais

- Camada: Unitário + API
- Objetivo: Distinguir ausência de dados, zero e denominador inválido.
- Pré-condições: Goleiro com estatísticas inicialmente não informadas.
- Entrada: Campos omitidos, null, zero, pares incompletos e valores válidos.
- Passos: Calcular indicadores; enviar PATCH parcial; reler estatísticas; limpar campo.
- Esperado: Sem porcentagens inventadas: dados ausentes ou denominador zero produzem null; zero observado é preservado.
- Obtido: Campos ausentes/null e denominador zero mantiveram null; zero observado permaneceu zero; percentuais válidos foram 80% e 50%, com PATCH parcial preservando outros campos.
- Status: Aprovado

### CT-18 — Médias e desempenho

- Camada: Unitário + interface + API
- Objetivo: Conferir fórmulas contra resultados numéricos conhecidos.
- Pré-condições: Dois treinos com notas e presenças controladas.
- Entrada: Notas 6, 8 e 10; três presenças em seis registros; medidas 2 e 3.
- Passos: Salvar registros; calcular médias coletivas e ponderadas; conferir indicadores exibidos.
- Esperado: Média coletiva 8, presença 50%, soma observada 5 e ponderação histórica preservada.
- Obtido: Dados reais produziram média coletiva 8, três avaliações, presença 50% e Gols=5; interface exibiu 8,0/10 e 50%; fórmula ponderada histórica conferida.
- Status: Aprovado

### CT-19 — Proteção de rotas e IDs

- Camada: Interface + API + MySQL
- Objetivo: Bloquear acesso anônimo, escalada de perfil e manipulação de IDs.
- Pré-condições: Atleta aprovado, atleta pendente, equipe alheia e conta protegida.
- Entrada: Sem token, token adulterado, IDs alheios, role/id no PATCH /auth/me.
- Passos: Tentar consultas e mutações proibidas; abrir URL administrativa como atleta; conferir banco.
- Esperado: 401/403/404 conforme contrato, UI bloqueada e identidades/recursos intactos.
- Obtido: Acesso anônimo/adulterado, escalada de perfil, IDs manipulados e recursos sem vínculo foram bloqueados; API não expôs e-mails alheios e UI negou rota administrativa.
- Status: Aprovado

### CT-20 — Navegação e responsividade

- Camada: Ponta a ponta
- Objetivo: Garantir páginas acessíveis e sem overflow em quatro resoluções.
- Pré-condições: Equipe com dados, treinador e atleta autenticáveis.
- Entrada: 360×800, 768×1024, 1366×900 e 1920×1080.
- Passos: Navegar equipe, perfil, elenco e treino; recarregar; testar menu móvel; medir cards e página.
- Esperado: Sem erro de JavaScript, overflow horizontal ou textos de cards cortados; menu e destinos utilizáveis.
- Obtido: Navegação real e reload conferidos em mobile/tablet/desktop (360, 768, 1366 e 1920 px), nos dois perfis; sem erros JavaScript, overflow, cards cortados ou alvos de menu abaixo de 44 px.
- Status: Aprovado
