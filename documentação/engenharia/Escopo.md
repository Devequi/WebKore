# Documentação de Escopo — WebKore

## Visão Geral

O WebKore é uma plataforma web desenvolvida para auxiliar treinadores e atletas no acompanhamento do desempenho esportivo. A proposta do sistema é reunir informações de treinos e avaliações em um único ambiente, permitindo que treinadores acompanhem a evolução de seus atletas e utilizem os dados registrados para apoiar suas decisões.

Além disso, os próprios atletas poderão visualizar seu histórico de treinos, frequência e desempenho ao longo do tempo por meio de gráficos e estatísticas simples.

O sistema será utilizado por treinadores e atletas, cada um com funcionalidades específicas de acordo com seu perfil.

---

## Objetivo do Sistema

O principal objetivo do WebKore é facilitar o acompanhamento do desempenho esportivo por meio do registro de treinos, presenças, avaliações e métricas esportivas.

A partir desses dados, o sistema apresentará gráficos e informações que permitam visualizar a evolução dos atletas de forma simples e organizada.

---

## Tecnologias Utilizadas

### Frontend

* React
* Vite
* Recharts

### Backend

* Node.js
* Express

### Banco de Dados

* MySQL
* Prisma ORM

### PWA e Armazenamento Local

O WebKore poderá ser instalado como um PWA (Progressive Web App), permitindo acesso rápido em dispositivos móveis.

O sistema também utilizará armazenamento local para auxiliar o registro de informações em situações de instabilidade de conexão, evitando a perda de dados durante o uso.

---

# Sistema de Acesso

## Cadastro de Treinador

* Nome completo
* E-mail
* Senha

## Cadastro de Atleta

* Nome completo
* Data de nascimento
* E-mail
* Senha

---

# Área do Atleta

## Busca de Equipes

O atleta poderá pesquisar equipes utilizando um código de acesso e enviar uma solicitação de entrada.

## Lobby do Atleta

O lobby apresentará todas as equipes das quais o atleta participa, além da opção de buscar novas equipes.

## Página Inicial

A página inicial exibirá informações como:

* Média de presença
* Quantidade de treinos realizados
* Média de desempenho
* Gráfico de evolução
* Histórico de treinos

A média de desempenho será calculada a partir das avaliações registradas pelos treinadores durante os treinos.

## Perfil

O atleta poderá:

* Alterar foto de perfil
* Editar informações pessoais
* Visualizar suas equipes
* Sair de uma equipe

---

# Área do Treinador

## Lobby de Equipes

O treinador poderá criar equipes, visualizar equipes já cadastradas, copiar códigos de acesso e gerenciar seus times.

## Criação de Equipes

Para criar uma equipe será necessário informar:

* Nome da equipe
* Modalidade esportiva

Após a criação, o sistema gerará automaticamente um código de acesso para os atletas.

As modalidades inicialmente previstas são:

* Futebol
* Vôlei
* Basquete

## Áreas da Equipe

Cada equipe contará com as seguintes áreas:

* Home
* Atletas
* Solicitações
* Treinos
* Configurações

---

# Home da Equipe

A página principal da equipe apresentará informações gerais como:

* Quantidade de atletas
* Quantidade de treinos
* Média de presença
* Atleta destaque 
* Gráfico de evolução
* Informações do último treino

O atleta destaque será definido automaticamente com base na melhor média de desempenho da equipe, considerando as avaliações registradas nos treinos.

---

# Solicitações

Nesta área o treinador poderá aceitar ou recusar pedidos de entrada enviados pelos atletas.

---

# Atletas

O treinador poderá:

* Visualizar integrantes da equipe
* Editar número do atleta
* Editar posição
* Acessar o perfil completo de cada atleta

---

# Perfil do Atleta

O perfil apresentará:

* Informações pessoais
* Média de presença
* Quantidade de treinos
* Média de desempenho
* Gráfico de evolução
* Histórico de avaliações

---

# Treinos

## Cadastro de Treino

Para cadastrar um treino serão informados:

* Data
* Tipo de treino
* Descrição (opcional)

Os tipos de treino disponíveis serão:

* Físico
* Coletivo
* Misto

## Registro de Presença

Ao iniciar o registro de presença, todos os atletas serão considerados presentes automaticamente, sendo necessário alterar apenas aqueles que estiverem ausentes.

## Registro de Desempenho

As avaliações serão realizadas utilizando notas de 0 a 10.

Ao abrir a avaliação, todos os critérios iniciarão com nota 5, permitindo que o treinador ajuste os valores conforme o desempenho observado.

Além das avaliações, também poderão ser registradas métricas numéricas relacionadas à modalidade esportiva, como gols, assistências, pontos, defesas e outras estatísticas.

## Histórico de Treinos

O sistema armazenará um histórico contendo:

* Participantes
* Presenças
* Avaliações
* Métricas registradas

---

# Configurações da Equipe

Nesta área será possível:

* Editar informações da equipe
* Visualizar o código de acesso
* Gerenciar critérios de avaliação
* Excluir a equipe

## Critérios de Avaliação

Existem dois tipos de critério de avaliação
* Objetivo
* Qualitativo

### Obejtivos :

Os critérios objetivos são aqueles baseados em números e estatísticas registradas durante os treinos e jogos, como gols, assistências, pontos e defesas.

Esses valores serão preenchidos pelo treinador através de campos numéricos.

### Qualitativos

Critérios **Qualitativos** são baseados na opnião do treinador sobre o atleta em um críterio especifico (Posicionamento, Liderança, Visão de jogo) Essas avaliações serão registradas pelo treinador utilizando um controle deslizante com notas de 0 a 10.

Cada equipe poderá utilizar critérios próprios para avaliar seus atletas.

Ao criar uma equipe, o sistema já terá critérios Qualitativos pré definidos, o treinador poderá adicionar, editar ou remover critérios conforme a necessidade da equipe.

Os critérios cadastrados serão utilizados automaticamente durante as avaliações dos treinos.

---

# Dashboards

O sistema contará com dashboards para facilitar a visualização dos dados registrados.

Os gráficos poderão apresentar informações como:

* Evolução do desempenho dos atletas
* Histórico de presença
* Média de desempenho
* Comparação entre avaliações
* Evolução das métricas esportivas
* Dados gerais da equipe

As informações registradas ao longo dos treinos serão transformadas em gráficos para facilitar a análise da evolução dos atletas.

Posteriormente, novos dashboards poderão ser adicionados conforme a evolução do sistema.

---

# Configurações da Conta

O usuário poderá:

* Alterar informações da conta
* Alterar senha
* Encerrar sessão
* Excluir conta

## Exclusão de Conta

Antes da exclusão será exibida uma tela de confirmação informando que a ação é permanente.

Caso um treinador exclua sua conta, todas as equipes criadas por ele e os dados relacionados também serão removidos do sistema.



# Diferenciais do Sistema

* Instalação como PWA
* Armazenamento local em situações de instabilidade de conexão
* Entrada em equipes por código
* Participação em múltiplas equipes
* Registro simplificado de presença
* Critérios de avaliação personalizáveis
* Métricas qualitativas e numéricas
* Interface mobile-first
* Dashboards com gráficos
* Suporte a diferentes modalidades esportivas

---

# Considerações Finais

O WebKore busca oferecer uma solução prática para o acompanhamento do desempenho esportivo, reunindo informações de treinos, avaliações e métricas em um único ambiente.

Com isso, treinadores poderão acompanhar seus atletas de forma mais organizada, enquanto os atletas terão acesso à própria evolução por meio de gráficos, estatísticas e históricos de desempenho.
