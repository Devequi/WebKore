# Requisitos Funcionais(RF)

### Autenticação
| ID | Nome do Requisito | Descrição | Dependências |
| --- | --- | --- | --- |
| RF01 | Cadastro de Treinadores | O sistema deve permitir o cadastro de treinadores informando nome completo, e-mail e senha. | Nenhuma |
| RF02 | Login de Treinadores | O sistema deve permitir o login de treinadores utilizando e-mail e senha. | RF01 |
| RF03 | Cadastro de Atletas | O sistema deve permitir o cadastro de atletas informando nome completo, data de nascimento, e-mail e senha. | Nenhuma |
| RF04 | Login de Atletas | O sistema deve permitir o login de atletas utilizando e-mail e senha. | RF03 |

---

### Equipes

| ID | Nome do Requisito | Descrição | Dependências |
| --- | --- | --- | --- |
| RF05 | Criação de Equipes | O sistema deve permitir que o treinador crie equipes informando nome e modalidade esportiva (Futebol, Vôlei, Basquete). | RF02 |
| RF06 | Geração de Código da Equipe | O sistema deve gerar automaticamente um código único de acesso para cada equipe criada. | RF05 |
| RF07 | Compartilhamento de Código | O sistema deve permitir ao treinador visualizar e compartilhar o código da equipe. | RF06 |
| RF08 | Busca de Equipe por Código | O sistema deve permitir que atletas busquem equipes através do código de acesso. | RF04 |
| RF09 | Solicitação de Entrada | O sistema deve permitir que atletas solicitem entrada em uma equipe após a busca. | RF08 |
| RF10 | Aprovação de Solicitações | O sistema deve permitir que treinadores aceitem ou recusem solicitações de entrada na área de "Solicitações". | RF02, RF09 |
| RF11 | Lobby de Equipes do Treinador | O sistema deve exibir ao treinador uma lista com todas as equipes sob sua responsabilidade, com opções de gerenciamento. | RF05 |
| RF12 | Lobby de Equipes do Atleta | O sistema deve exibir ao atleta uma lista das equipes às quais ele pertence, além da opção de buscar novas. | RF04 |
| RF13 | Gerenciamento de Critérios | O sistema deve permitir ao treinador adicionar, editar ou remover critérios de avaliação qualitativos da equipe. | RF05 |
| RF14 | Exclusão de Equipe | O sistema deve permitir que o treinador exclua a equipe na área de configurações. | RF05 |

---

### Atletas

| ID | Nome do Requisito | Descrição | Dependências |
| --- | --- | --- | --- |
| RF15 | Visualização do Elenco | O sistema deve permitir que o treinador visualize o elenco completo de uma equipe na aba "Atletas". | RF10 |
| RF16 | Perfil Completo do Atleta | O sistema deve permitir que o treinador acesse o perfil detalhado de um atleta (presença, quantidade de treinos, média de desempenho, gráfico e histórico). | RF15, RF24 |
| RF17 | Edição de Dados Esportivos | O sistema deve permitir ao treinador a edição de informações esportivas do atleta, como posição e número. | RF15 |
| RF18 | Edição de Perfil do Atleta | O sistema deve permitir que atletas visualizem e editem seus próprios dados cadastrais e alterem sua foto de perfil. | RF04 |
| RF19 | Saída de Equipe | O sistema deve permitir que atletas saiam de uma equipe vinculada através do seu perfil. | RF10 |

---

### Treinos

| ID | Nome do Requisito | Descrição | Dependências |
| --- | --- | --- | --- |
| RF20 | Cadastro de Treinos | O sistema deve permitir o cadastro de treinos contendo data, tipo (Físico, Coletivo ou Misto) e descrição opcional. | RF05 |
| RF21 | Registro de Presença | O sistema deve iniciar o registro de presença com todos os atletas presentes automaticamente, permitindo alteração apenas dos ausentes. | RF15, RF20 |
| RF22 | Lançamento de Métricas (Objetivas) | O sistema deve permitir o lançamento de métricas esportivas específicas numéricas (ex: gols, assistências, defesas). | RF20 |
| RF23 | Avaliação de Atletas (Qualitativas) | O sistema deve permitir o lançamento de avaliações qualitativas através de um controle deslizante, com notas de 0 a 10, iniciando obrigatoriamente com a nota 5. | RF13, RF20 |
| RF24 | Histórico de Treinos | O sistema deve manter um histórico contendo participantes, presenças, avaliações e métricas registradas. | RF21, RF22, RF23 |

---

### Dashboards

| ID | Nome do Requisito | Descrição | Dependências |
| --- | --- | --- | --- |
| RF25 | Home da Equipe | O sistema deve apresentar na Home da Equipe dados como: quantidade de atletas e treinos, média de presença, gráfico de evolução e informações do último treino. | RF15, RF24 |
| RF26 | Atleta Destaque | O sistema deve definir e exibir automaticamente na Home o "Atleta destaque" com base na melhor média de desempenho. | RF23 |
| RF27 | Dashboards do Atleta | O sistema deve apresentar indicadores individuais na página inicial do atleta (média de presença, total de treinos, média de desempenho e gráficos). | RF04, RF24 |
| RF28 | Gráficos de Evolução e Comparação | O sistema deve gerar gráficos baseados nas informações registradas ao longo dos treinos, incluindo evolução do desempenho, histórico de presença e comparação entre avaliações. | RF24 |

---

### Configurações

| ID | Nome do Requisito | Descrição | Dependências |
| --- | --- | --- | --- |
| RF29 | Alteração de Dados da Conta | O sistema deve permitir que usuários (treinadores e atletas) alterem suas informações de conta e senha. | RF02 ou RF04 |
| RF30 | Logout | O sistema deve permitir que usuários realizem o encerramento da sessão. | RF02 ou RF04 |
| RF31 | Exclusão de Conta | O sistema deve permitir a exclusão da conta, exibindo tela de confirmação de ação permanente. | RF02 ou RF04 |
| RF32 | Exclusão em Cascata (Treinador) | Caso um treinador exclua sua conta, todas as equipes criadas por ele e os dados relacionados devem ser removidos do sistema. | RF31 |

---

# Requisitos Não Funcionais (RNF)

| ID | Nome do Requisito | Descrição | Categoria |
| --- | --- | --- | --- |
| RNF01 | Mobile First | O sistema deve ser desenvolvido seguindo a abordagem Mobile First. | Usabilidade |
| RNF02 | Interface Intuitiva | O sistema deve possuir interface intuitiva e de fácil utilização. | Usabilidade |
| RNF03 | PWA (Progressive Web App) | O sistema deve ser instalável como um PWA, permitindo acesso rápido em dispositivos móveis. | Acessibilidade |
| RNF04 | Armazenamento Local (Offline) | O sistema deve utilizar armazenamento local para reter temporariamente os dados em caso de instabilidade de conexão, evitando perda de informações. | Confiabilidade |
| RNF05 |  Frontend | O frontend deve ser construído utilizando React, Vite e Recharts. | Arquitetura |
| RNF06 |  Backend | O backend deve ser construído utilizando Node.js e Express. | Arquitetura |
| RNF07 | Banco de Dados | O sistema deve utilizar banco de dados relacional MySQL integrado com Prisma ORM. | Arquitetura |
| RNF08 | Tempo de Resposta | As principais operações do sistema devem ser executadas em até 2 segundos em condições normais de uso. | Desempenho |
| RNF09 | Escalabilidade | O sistema deve suportar pelo menos 50 usuários simultâneos sem perda significativa de desempenho. | Escalabilidade |
| RNF10 | Arquitetura REST | A comunicação entre frontend e backend deve ocorrer através de APIs REST. | Arquitetura |
| RNF11 | Controle de Acesso | O sistema deve restringir o acesso aos dados conforme o perfil do usuário (Treinador/Atleta). | Segurança |
| RNF12 | Segurança de Autenticação | As senhas devem ser armazenadas utilizando criptografia por hash e autenticação via JWT. | Segurança |
| RNF13 | Conformidade com a LGPD | O sistema deve atender aos princípios da LGPD para proteção dos dados dos usuários. | Legal |