# Requisitos do Sistema — WebKore (Versão Final Granular)

---

## 1. Requisitos Funcionais (RF)

### Módulo de Autenticação

| ID | Nome do Requisito | Descrição | Prioridade | Dependências |
|:---|:---|:---|:---|:---|
| **RF01** | Cadastro de Treinador | O sistema deve permitir que um novo treinador se cadastre fornecendo nome completo, e-mail e senha. | Essencial | Nenhuma |
| **RF02** | Login de Treinador | O sistema deve permitir que um treinador cadastrado realize autenticação (login) utilizando e-mail e senha. | Essencial | RF01 |
| **RF03** | Cadastro de Atleta | O sistema deve permitir que um novo atleta se cadastre de forma independente, informando nome completo, idade, e-mail e senha. | Essencial | Nenhuma |
| **RF04** | Login de Atleta | O sistema deve permitir que um atleta cadastrado realize autenticação (login) utilizando e-mail e senha. | Essencial | RF03 |

### Módulo de Equipes (Treinador)

| ID | Nome do Requisito | Descrição | Prioridade | Dependências |
|:---|:---|:---|:---|:---|
| **RF05** | Lobby de Equipes do Treinador | Após o login, o sistema deve exibir um Lobby com cards de todas as equipes criadas pelo treinador, mostrando nome, modalidade e código de cada uma. | Essencial | RF02 |
| **RF06** | Criação de Equipe | O sistema deve permitir que o treinador crie uma nova equipe informando nome e modalidade esportiva. Ao criar, o sistema deve gerar automaticamente um Código Único da Equipe (ex: `WK-TEAM-404`). | Essencial | RF02, RF05 |
| **RF07** | Compartilhamento de Código da Equipe | O sistema deve oferecer um botão "Copiar Código" em cada card de equipe (no Lobby e na área de Atletas) que copia o código único para a área de transferência. | Importante | RF05, RF06 |

### Módulo de Equipes (Atleta)

| ID | Nome do Requisito | Descrição | Prioridade | Dependências |
|:---|:---|:---|:---|:---|
| **RF08** | Busca de Equipe por Código | Após o login, o atleta deve ter uma tela para inserir o Código Único da Equipe. Ao encontrar a equipe, o sistema exibe nome, modalidade e treinador, e permite clicar em "Solicitar Entrada". | Essencial | RF04, RF06 |
| **RF09** | Lobby de Equipes do Atleta | O sistema deve exibir um Lobby para o atleta contendo cards de todas as equipes às quais ele foi aprovado, permitindo selecionar uma para acessar seus dados. | Essencial | RF04, RF08, RF11 |
| **RF10** | Solicitar Entrada em Nova Equipe | No Lobby do atleta, deve haver um botão "+ Entrar em Nova Equipe" que redireciona para a tela de busca (RF08), permitindo ingressar em outras equipes. | Importante | RF08, RF09 |
| **RF11** | Gestão de Solicitações (Treinador) | O sistema deve fornecer uma aba "Solicitações" onde o treinador visualiza pedidos pendentes (foto, nome, idade) e pode clicar em "Aceitar" ou "Recusar". Ao aceitar, a equipe aparece no Lobby do atleta. | Essencial | RF02, RF08 |

### Módulo de Perfil

| ID | Nome do Requisito | Descrição | Prioridade | Dependências |
|:---|:---|:---|:---|:---|
| **RF12** | Perfil do Atleta (Visão Atleta) | O atleta deve ter uma página de perfil com foto, dados pessoais, lista de equipes vinculadas e opção "Sair da Equipe". Deve permitir editar foto e dados. | Essencial | RF03, RF09 |
| **RF13** | Perfil do Atleta (Visão Treinador) | O treinador, ao selecionar um atleta do elenco, deve visualizar perfil completo: foto, nome, número, posição, indicadores, gráfico de evolução, histórico e botão "Remover da equipe". | Essencial | RF02, RF11 |
| **RF14** | Edição de Atributos do Atleta | O treinador pode editar o número e a posição de um atleta dentro da sua equipe. | Importante | RF13 |

### Módulo de Treinos e Avaliação

| ID | Nome do Requisito | Descrição | Prioridade | Dependências |
|:---|:---|:---|:---|:---|
| **RF15** | Cadastro de Treinos | O treinador pode cadastrar um novo treino informando data, tipo (Físico, Coletivo, Misto) e, opcionalmente, descrição. | Essencial | RF02, RF05 |
| **RF16** | Registro de Presença por Exceção | No momento do registro de um treino, todos os atletas do elenco iniciam como "Presentes". O treinador altera apenas os ausentes. | Essencial | RF11, RF15 |
| **RF17** | Lançamento de Métricas Objetivas | O treinador pode registrar métricas quantitativas (gols, assistências, etc.) por atleta, utilizando botões `+` e `-`. As métricas disponíveis dependem da modalidade da equipe. | Essencial | RF15, RF16 |
| **RF18** | Lançamento de Avaliações Qualitativas | O treinador atribui notas de 0 a 10 para cada atleta nos critérios: Técnica, Condicionamento Físico, Participação e Trabalho em Equipe. Todos iniciam com nota padrão 5, e o treinador ajusta via sliders apenas o necessário. | Essencial | RF15, RF16 |
| **RF19** | Histórico de Treinos Expansível | A lista de treinos exibe data, tipo e descrição. Ao expandir um treino, são mostrados participantes, métricas objetivas e avaliações qualitativas. | Importante | RF15, RF17, RF18 |

### Módulo de Dashboards

| ID | Nome do Requisito | Descrição | Prioridade | Dependências |
|:---|:---|:---|:---|:---|
| **RF20** | Dashboard do Treinador (Home da Equipe) | Na Home da equipe, exibir cards de KPIs (total de atletas, treinos, presença média, atleta destaque), gráfico de evolução média da equipe e card do último treino. | Essencial | RF15, RF16, RF17, RF18 |
| **RF21** | Dashboard Individual do Atleta (Visão Atleta) | Ao acessar uma equipe, o atleta vê indicadores (presença, treinos, média), gráfico de evolução e histórico de treinos. | Essencial | RF09, RF17, RF18 |
| **RF22** | Dashboard Individual (Visão Treinador) | No perfil de um atleta, o treinador visualiza indicadores de presença e desempenho, gráfico de evolução individual e histórico completo. | Essencial | RF13, RF17, RF18 |

### Módulo de Configurações e Relatórios

| ID | Nome do Requisito | Descrição | Prioridade | Dependências |
|:---|:---|:---|:---|:---|
| **RF23** | Configurações da Conta do Treinador | O treinador pode alterar seus dados cadastrais, senha, fazer logout ou excluir a conta. | Importante | RF01, RF02 |
| **RF24** | Exportação de Relatórios | O treinador pode exportar relatórios de desempenho dos atletas em formato PDF ou planilha. | Desejável | RF20, RF22 |

---

## 2. Requisitos Não Funcionais (RNF)

| ID | Nome do Requisito | Descrição | Categoria | Dependências |
|:---|:---|:---|:---|:---|
| **RNF01** | Abordagem Mobile-First | O sistema deve ser projetado prioritariamente para dispositivos móveis, garantindo que todas as funcionalidades sejam plenamente operacionais em telas de smartphones, com adaptação fluida para tablets e desktops. | Usabilidade | Nenhuma |
| **RNF02** | Funcionamento Offline (PWA) | O sistema deve implementar tecnologia Progressive Web App (PWA) com Service Worker, permitindo que o treinador preencha avaliações de treino mesmo sem conexão com a internet, armazenando os dados localmente via LocalStorage e sincronizando automaticamente quando a conexão for restabelecida. | Confiabilidade / Disponibilidade | RF15, RF16, RF17, RF18 |
| **RNF03** | Instalação como PWA | O sistema deve permitir que usuários (treinadores e atletas) instalem o WebKore na tela inicial de seus dispositivos móveis, com ícone personalizado e experiência em tela cheia (standalone). | Usabilidade | RNF02 |
| **RNF04** | Desempenho e Velocidade | O sistema deve carregar gráficos, históricos e páginas principais em até 2 segundos para consultas comuns em uma conexão estável de internet. Em modo offline, o salvamento local deve ser instantâneo (abaixo de 500ms). | Desempenho | Nenhuma |
| **RNF05** | Capacidade e Escalabilidade | O sistema deve suportar o acesso simultâneo de pelo menos 50 usuários ativos (treinadores e atletas) sem apresentar degradação no tempo de resposta. | Escalabilidade | RNF04 |
| **RNF06** | Arquitetura de Comunicação | O sistema deve utilizar comunicação padronizada entre frontend (React) e backend (Node.js/Express) através de APIs REST, garantindo modularidade. A sincronização offline deve utilizar estratégia de fila e retry. | Padronização | RNF02 |
| **RNF07** | Responsividade | O sistema deve adaptar automaticamente a interface gráfica para telas de computadores (desktop), tablets e dispositivos móveis, com componentes e gráficos redimensionáveis. | Usabilidade | RNF01 |
| **RNF08** | Privacidade dos Dados | O sistema deve garantir que atletas visualizem apenas os próprios dados e que treinadores tenham acesso exclusivamente aos atletas vinculados à sua equipe. Atletas com solicitação "Pendente" não devem ter acesso aos dados da equipe até aprovação. | Privacidade | RF01, RF03, RF08, RF11 |
| **RNF09** | Segurança na Autenticação | O sistema deve armazenar as senhas de acesso de forma criptografada (hash + salt) no banco de dados e utilizar tokens seguros (JWT) para gerenciamento de sessões. | Segurança | RF01, RF02, RF03, RF04 |
| **RNF10** | Disponibilidade | O sistema deve garantir uma taxa de disponibilidade mínima de 99% durante o horário de funcionamento das atividades, com as funcionalidades offline (PWA) garantindo continuidade mesmo em caso de falha do servidor ou falta de internet. | Confiabilidade | RNF02 |
| **RNF11** | Manutenibilidade | O código do sistema deve ser modular, documentado e seguir padrões de mercado (componentização no frontend, organização em camadas no backend) para facilitar futuras manutenções e a inclusão de novas modalidades esportivas. | Manutenção | Nenhuma |
| **RNF12** | Configurabilidade de Métricas por Modalidade | O banco de dados e a interface devem ser estruturados para suportar diferentes métricas por modalidade esportiva (Futsal, Futebol, Vôlei, Basquete, Handebol), permitindo que novas modalidades sejam adicionadas sem alteração na estrutura do código. | Flexibilidade / Manutenção | RF17, RF18 |
| **RNF13** | Conformidade com a LGPD | O sistema deve tratar os dados dos atletas em conformidade com a Lei Geral de Proteção de Dados (LGPD), assegurando: controle de acesso e sigilo das informações de desempenho, possibilidade de exclusão de conta e dados, e termo de consentimento no cadastro. | Legal / Segurança | RF01, RF03, RF12 |