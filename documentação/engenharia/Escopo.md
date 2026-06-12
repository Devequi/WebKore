# Documentação de Escopo — WebKore

## Visão Geral

O WebKore é uma plataforma web esportiva desenvolvida para auxiliar treinadores e atletas no acompanhamento do desempenho esportivo por meio do registro e análise de dados de treinamento.

A plataforma busca transformar informações coletadas durante treinos e jogos em gráficos, estatísticas e indicadores visuais que facilitem a análise da evolução dos atletas e auxiliem na tomada de decisões dos treinadores.

O sistema será acessado por dois tipos de usuários: treinadores e atletas. Cada perfil possuirá funcionalidades específicas de acordo com suas necessidades.

Todas as informações serão armazenadas em banco de dados, permitindo o acompanhamento histórico dos treinos e da evolução dos atletas ao longo do tempo.

---

## Objetivo do Sistema

O principal objetivo do WebKore é oferecer uma ferramenta digital que facilite o acompanhamento do desempenho esportivo de atletas, permitindo o registro de dados de treinamentos, avaliações e participações em atividades esportivas.

Além disso, o sistema busca proporcionar aos atletas uma forma simples de acompanhar sua própria evolução por meio de gráficos e indicadores gerados a partir dos dados registrados pelos treinadores.

---

## Tecnologias Utilizadas

### Tecnologias Utilizadas

#### Frontend

- **React:** Biblioteca JavaScript utilizada para construir a interface de usuário da plataforma. Com React é possível criar componentes reutilizáveis, gerenciar o estado da aplicação de forma eficiente e oferecer uma navegação rápida e dinâmica para treinadores e atletas.

- **Vite:** Ferramenta de build e servidor de desenvolvimento que proporciona um ambiente extremamente rápido para projetos com React. O Vite acelera o processo de desenvolvimento com recarregamento instantâneo e otimiza a geração dos arquivos finais para publicação.

- **Recharts:** Biblioteca de gráficos específica para React. Será utilizada para renderizar dashboards, gráficos de linha de evolução e indicadores visuais de desempenho, transformando dados brutos em representações gráficas de fácil interpretação.

#### Backend

- **Node.js:** Ambiente de execução JavaScript no lado do servidor. Permite que toda a lógica de negócio, processamento de dados e regras da plataforma sejam executadas fora do navegador, viabilizando a construção de APIs e serviços web.

- **Express:** Framework para Node.js que simplifica a criação das rotas e o gerenciamento das requisições HTTP da API do WebKore. Com ele são definidos os endpoints que o frontend consome para autenticação, cadastro de treinos, consulta de dados e demais funcionalidades.

#### Banco de Dados

- **MySQL:** Sistema de gerenciamento de banco de dados relacional responsável por armazenar todas as informações estruturadas da plataforma, como dados de usuários, equipes, treinos, presenças e avaliações de desempenho. Sua estrutura relacional permite consultas complexas e análises históricas.

#### Comunicação

- **Prisma ORM:** Ferramenta de mapeamento objeto-relacional (ORM) que atua como ponte entre o backend Node.js e o banco de dados MySQL. O Prisma facilita a criação de consultas, migrações e modelagem dos dados de forma segura e tipada, reduzindo a complexidade do código SQL manual.

#### PWA e Funcionamento Offline

- **Service Worker:** Script executado em segundo plano pelo navegador, responsável por gerenciar o cache dos arquivos da aplicação. É ele que permite o funcionamento offline do WebKore, armazenando recursos essenciais e possibilitando a instalação da plataforma como um aplicativo (PWA) na tela inicial de dispositivos móveis.

- **LocalStorage:** API do navegador utilizada para armazenar dados localmente no dispositivo do usuário. Durante os treinos sem conexão com a internet, as avaliações e registros de desempenho são salvos temporariamente no LocalStorage. Quando a conexão é restabelecida, esses dados são sincronizados automaticamente com o servidor.
---

# Sistema de Acesso

## Tela Inicial

Ao acessar a plataforma, o usuário poderá:

* Fazer login;
* Criar uma conta.

Durante o cadastro deverá escolher seu perfil:

* Treinador;
* Atleta.

---

## Cadastro de Treinador

O treinador deverá informar:

* Nome completo;
* E-mail;
* Senha.

Após o login será direcionado ao Lobby de Equipes.

---

## Cadastro de Atleta

O atleta deverá informar:

* Nome completo;
* Idade;
* E-mail;
* Senha.

Após o login será direcionado para a área de busca de equipes.

---

# Área do Atleta

## Busca de Equipe

O atleta poderá informar o código fornecido pelo treinador para localizar uma equipe.

Ao encontrar a equipe serão exibidas informações como:

* Nome da equipe;
* Modalidade esportiva;
* Nome do treinador responsável.

O atleta poderá enviar uma solicitação para participar da equipe.

---

## Lobby do Atleta

Após ser aprovado em uma ou mais equipes, o atleta terá acesso a um lobby contendo todas as equipes das quais participa.

Cada equipe será exibida em um card contendo:

* Nome da equipe;
* Modalidade esportiva;
* Nome do treinador.

Ao selecionar um card, o atleta será direcionado para os dados daquela equipe.

Também haverá um botão para solicitar entrada em novas equipes.

---

## Página Inicial do Atleta

Nesta área o atleta poderá acompanhar informações relacionadas ao seu desempenho.

Serão exibidos:

* Média de presença;
* Quantidade de treinos realizados;
* Média geral de desempenho;
* Gráfico de evolução;
* Histórico de treinos.

---

## Perfil

O atleta poderá:

* Alterar foto de perfil;
* Editar informações pessoais;
* Visualizar equipes vinculadas;
* Sair de uma equipe.

---

# Área do Treinador

## Lobby de Equipes

Após realizar login, o treinador será direcionado para um lobby onde poderá visualizar todas as equipes cadastradas.

Nessa área será possível:

* Criar equipes;
* Visualizar equipes existentes;
* Copiar códigos de acesso;
* Acessar equipes para gerenciamento.

---

## Criação de Equipes

Ao clicar em "Criar Equipe", será aberta uma janela solicitando:

* Nome da equipe;
* Modalidade esportiva.

Após a confirmação, o sistema gerará automaticamente um código único para identificação da equipe.

Exemplo:

WK-TEAM-404

A equipe criada será adicionada ao lobby do treinador.

---

## Acesso à Equipe

Ao selecionar uma equipe, o treinador terá acesso às seguintes áreas:

* Home;
* Atletas;
* Solicitações;
* Treinos;
* Configurações.

---

# Home da Equipe

A página inicial apresentará um resumo geral das informações da equipe.

Serão exibidos:

* Quantidade de atletas;
* Quantidade de treinos realizados;
* Presença média da equipe;
* Atleta em destaque;
* Gráfico de evolução da equipe;
* Informações do último treino registrado.

---

# Solicitações

Área destinada ao gerenciamento das solicitações enviadas pelos atletas.

O treinador poderá visualizar:

* Foto do atleta;
* Nome;
* Idade.

Para cada solicitação haverá as opções:

* Aceitar;
* Recusar.

---

# Atletas

A área de atletas exibirá todos os integrantes da equipe.

Cada atleta será apresentado em um card contendo:

* Foto;
* Nome;
* Número;
* Posição;
* Presença média.

O treinador poderá editar:

* Número do atleta;
* Posição.

Também será possível acessar o perfil completo do atleta para visualizar seu histórico e desempenho.

---

# Perfil do Atleta

Ao acessar um atleta, o treinador poderá visualizar:

* Informações pessoais;
* Presença média;
* Quantidade de treinos;
* Média de desempenho;
* Gráfico de evolução;
* Histórico de avaliações.

Também será possível remover o atleta da equipe.

---

# Treinos

A área de treinos será responsável pelo cadastro e avaliação das atividades realizadas.

## Cadastro de Treino

Campos obrigatórios:

* Data;
* Tipo de treino.

Tipos disponíveis:

* Físico;
* Coletivo;
* Misto.

Campo opcional:

* Descrição.

---

## Registro de Presença

Todos os atletas serão considerados presentes automaticamente.

O treinador precisará alterar apenas os atletas ausentes.

---

## Registro de Desempenho

As avaliações qualitativas iniciam com nota 5 (em escala de 0 a 10) para todos os atletas. O treinador ajusta apenas as notas que considerar necessárias, seguindo o modelo de preenchimento por exceção.

O treinador poderá registrar métricas relacionadas à modalidade esportiva da equipe.

Exemplos:

* Gols;
* Assistências;
* Pontos;
* Defesas.

Além disso, poderá atribuir notas de 0 a 10 utilizando sliders para critérios:

* Técnica;
* Condicionamento físico;
* Participação;
* Trabalho em equipe.

---

## Histórico de Treinos

Todos os treinos cadastrados serão armazenados em um histórico.

Ao selecionar um treino será possível visualizar:

* Participantes;
* Métricas registradas;
* Avaliações realizadas.

---

# Configurações

Área destinada ao gerenciamento da conta do treinador.

Funcionalidades:

* Alterar dados da conta;
* Alterar senha;
* Fazer logout;
* Excluir conta.

---

# Estrutura do Banco de Dados

O banco de dados será composto por entidades responsáveis pelo armazenamento de:

* Usuários;
* Equipes;
* Solicitações;
* Treinos;
* Presenças;
* Avaliações;
* Métricas esportivas.

A estrutura será desenvolvida de forma que diferentes modalidades esportivas possam ser utilizadas sem necessidade de alterações significativas no sistema.

---

# Diferenciais do Sistema

* Funcionamento offline para registro de treinos em campo
* Instalação como aplicativo (PWA) em dispositivos móveis
* Sistema de entrada em equipes através de código de acesso;
* Possibilidade de participação em múltiplas equipes;
* Registro simplificado de presença;
* Combinação de métricas numéricas e avaliações qualitativas;
* Interface adaptada para dispositivos móveis;
* Utilização de gráficos para acompanhamento da evolução dos atletas;
* Estrutura preparada para diferentes modalidades esportivas;
* Integração entre treinadores e atletas em uma única plataforma.

---

# Considerações Finais

O WebKore pretende oferecer uma solução prática para o acompanhamento do desempenho esportivo, permitindo que treinadores registrem informações importantes sobre seus atletas e que os próprios atletas acompanhem sua evolução ao longo do tempo.

A plataforma busca unir simplicidade, organização e análise de dados em um único ambiente, contribuindo para o desenvolvimento esportivo de equipes, escolas e projetos esportivos.
