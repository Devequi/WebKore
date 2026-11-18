# Auditoria de navegação e sessão — 18/11/2026

## Problemas e correções

- `App.jsx` usava somente estados locais para a tela e os IDs selecionados. Agora a URL determina a página e o registro, inclusive após atualização e navegação Voltar/Avançar.
- A equipe e o atleta podiam cair silenciosamente no primeiro registro disponível. A equipe exige ID autorizado; o elenco exige seleção explícita. IDs inexistentes, removidos ou de outra equipe apresentam erro com retorno para Minhas equipes.
- Meu perfil era apenas uma mudança de estado. Treinador e atleta agora usam a mesma página exclusiva `#/perfil`, com consulta e edição dos dados reais da conta autenticada. O componente `MeuPerfil.jsx` recebe somente a conta e suas ações; não recebe estado esportivo, equipe ou ID de usuário arbitrário. As configurações da equipe não contêm formulário pessoal.
- Treinos misturavam cadastro, histórico e edição em estados transitórios. Histórico, cadastro e detalhe/avaliação agora possuem URLs. O detalhe mostra somente o treino escolhido. Criar abre o treino confirmado pela API; excluir retorna ao histórico. Feedback acompanha essas transições.
- Atletas agora consultam um treino individual em URL própria, com seus registros e avaliações, sem controles de edição administrativos. O componente de consulta é compartilhado com os diálogos contextuais existentes.
- Menus de páginas sem equipe ofereciam ações administrativas sem contexto. Agora exibem Equipes e Perfil até que uma equipe seja selecionada. Desktop e mobile usam a mesma lista e o mesmo roteamento.
- Falha temporária ao restaurar sessão podia mostrar o login mesmo havendo token persistido. Agora existe uma etapa de recuperação com Tentar novamente e Voltar ao login, preservando o token até validação da API ou logout explícito.
- Troca de token em outra aba podia manter os dados anteriores visíveis durante a consulta. Agora esses dados são ocultados imediatamente. A sessão também é revalidada a cada minuto enquanto a página está visível, além dos eventos de foco e alterações existentes.
- Exclusão de equipe retorna à lista com confirmação. Remoção de atleta retorna ao elenco. Edições permanecem na página. Saída de equipe acontece em Minhas equipes, com confirmação, feedback e preservação do histórico.
- A cópia do código nas configurações agora trata indisponibilidade/erro da área de transferência e exibe feedback.

## Rotas

Foi preservada a navegação leve do React, sem adicionar dependências de roteamento. O módulo `src/services/navigation.js` centraliza interpretação, construção e validação das URLs. O fragmento `#` permite acesso direto em hospedagem estática sem exigir configuração de reescrita no servidor.

| Endereço após a origem | Uso |
| --- | --- |
| `#/login` | Entrada; sessão válida redireciona à área do perfil |
| `#/coach/teams` | Área inicial e equipes do treinador |
| `#/perfil` | Única página pessoal da conta autenticada, para treinador e atleta |
| `#/coach/teams/:teamId` | Dashboard e estatísticas da equipe |
| `#/coach/teams/:teamId/athletes` | Elenco |
| `#/coach/teams/:teamId/athletes/:athleteId` | Perfil esportivo, edição do vínculo e histórico individual |
| `#/coach/teams/:teamId/requests` | Solicitações |
| `#/coach/teams/:teamId/trainings` | Histórico de treinos |
| `#/coach/teams/:teamId/trainings/new` | Cadastro de treino |
| `#/coach/teams/:teamId/trainings/:trainingId` | Detalhe, presença e avaliação |
| `#/coach/teams/:teamId/evaluations` | Configuração dos critérios |
| `#/coach/teams/:teamId/settings` | Configurações da equipe e exportação do relatório |
| `#/athlete/teams` | Área inicial e equipes aprovadas do atleta |
| `#/athlete/search` | Busca por código e solicitação de entrada |
| `#/athlete/teams/:teamId` | Dados, gráficos e histórico do próprio atleta |
| `#/athlete/teams/:teamId/trainings/:trainingId` | Consulta do próprio registro no treino |

Criar equipe continua como formulário curto na lista, e confirmação de exclusão/saída continua em diálogo. Filtros, recolhimento de painéis e edição simples permanecem componentes locais. Saída de equipes fica na lista Minhas equipes do atleta. Relatórios e estatísticas continuam no contexto da equipe; a exportação CSV permanece nas configurações. Essas escolhas preservam gráficos e funcionalidades sem fragmentar a navegação.

## Autenticação e autorização

O cadastro já retornava JWT, usuário e estado autenticado pela API. Esse contrato foi preservado. Cadastro e login agora retornam a sessão validada ao chamador e direcionam explicitamente à área inicial do perfil somente após `authenticate` verificar resposta completa, perfil correspondente, token presente e ausência de cancelamento. Não há segunda solicitação de credenciais.

Atualizar a página usa `/auth/me` e mantém a URL solicitada após validar a sessão. Logout limpa token, dados e estado de carregamento e substitui a URL por `#/login`. Rotas protegidas nunca renderizam conteúdo privado sem sessão restaurada. O tratamento de 401 e a invalidação de respostas antigas foram mantidos.

A auditoria das rotas Express, do middleware JWT, das projeções e dos filtros em `acesso.js` confirmou proteção existente por usuário, proprietário da equipe, vínculo aprovado e registro individual. A API continua responsável por autorizar cada operação. Não foram necessários endpoints, migrations ou alterações de regras de negócio. A integração real verificou dois treinadores, dois atletas, contas removidas, tokens inválidos/expirados e isolamento de dados.

## Validação

- `npm test`: 85 testes, incluindo novos casos de parsing/construção de rotas, acesso por perfil/equipe/registro, remoção de contexto, seleção explícita do elenco, separação do treino e rejeição de autenticação incompleta/cancelada.
- `npm run test:integration -- 7`: sete etapas aprovadas com API Express e MySQL reais. Cadastro e login automático, restauração, JWT, CRUD, solicitações, privacidade, permissões, concorrência e rollback. Fixtures temporárias removidas; o script confirmou preservação dos dados anteriores.
- `npm run build` e `npm run test:build`: build e verificação dos artefatos.
- Navegador com contas de teste existentes e API real: login de treinador e atleta, Meu perfil, atualização do perfil por recarga sem perder sessão, equipe, elenco sem seleção implícita, atleta por URL, recarga e Voltar, treino do treinador, treino individual do atleta após recarga, logout, menu móvel em 390 × 844 e bloqueio da rota do treinador quando autenticado como atleta. Nenhum registro esportivo existente foi editado nessa conferência.

## Limites de validação

A conferência visual cobriu os fluxos descritos e o viewport móvel de 390 px; não equivale a uma matriz de todos os navegadores e dispositivos. Falhas de rede e cancelamento têm testes automatizados de serviço; troca de conta entre abas e a revalidação periódica devem também integrar o teste de aceitação da implantação. URLs usam o formato com `#` da tabela acima. Os endereços pessoais anteriores são apenas redirecionamentos para `#/perfil`, sem páginas alternativas.


## Separação definitiva do perfil pessoal

A revisão seguinte removeu `paginas/atleta/PerfilAtleta.jsx` e `paginas/treinador/PerfilTreinador.jsx`, assim como o modo pessoal de `ConfigsTreinador.jsx`. A página `paginas/MeuPerfil.jsx` concentra dados de conta, função, data de criação e os campos pessoais editáveis já disponíveis para cada perfil. Mantém alteração de senha e exclusão para treinador, além de foto/iniciais e nascimento para atleta. Os formulários continuam usando `/auth/me`, sem receber um usuário alvo na URL.

O menu principal utiliza um único identificador `profile` e destaca Meu Perfil por `aria-current="page"` e pela classe visual ativa. As configurações contextuais são explicitamente rotuladas Configurações da equipe. O perfil pessoal não apresenta lista de equipes, estatísticas esportivas ou gestão de vínculos. Os perfis de atletas autorizados em `/coach/teams/:teamId/athletes/:athleteId` permanecem preservados.

Testes adicionais cobrem a rota pessoal sem equipe para ambos os perfis, redirecionamento dos endereços anteriores, impossibilidade de colocar o perfil dentro de uma equipe, página pessoal do treinador sem equipes, página pessoal do atleta, destaque do menu e ausência do formulário pessoal nas configurações da equipe.


Na conferência de navegador desta separação, foram verificados: abertura de Meu Perfil pelo menu da equipe, retirada do nome/modalidade da equipe do cabeçalho, destaque do menu pessoal, recarga mantendo a conta e a rota, redirecionamento do endereço antigo, mesma rota para atleta, disposição móvel de 390 × 844 e confirmação/cancelamento da saída em Minhas equipes. Os dados e vínculos existentes não foram modificados.
