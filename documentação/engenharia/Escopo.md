# Documentação de Escopo — WebKore

## Visão Geral

O WebKore é uma plataforma web esportiva desenvolvida para auxiliar treinadores e atletas no acompanhamento do desempenho esportivo por meio do registro e análise de dados de treinamento.

A plataforma busca transformar informações coletadas durante treinos e jogos em gráficos, estatísticas e indicadores visuais que facilitem a análise da evolução dos atletas e auxiliem na tomada de decisões dos treinadores.

O sistema será acessado por dois tipos de usuários: treinadores e atletas. Cada perfil possuirá funcionalidades específicas de acordo com suas necessidades.

Todas as informações serão armazenadas em banco de dados, permitindo o acompanhamento histórico dos treinos e da evolução dos atletas ao longo do tempo.

## Objetivo do Sistema

O principal objetivo do WebKore é oferecer uma ferramenta digital que facilite o acompanhamento do desempenho esportivo de atletas, permitindo o registro de dados de treinamentos, avaliações e participações em atividades esportivas.

Além disso, o sistema busca proporcionar aos atletas uma forma simples de acompanhar sua própria evolução por meio de gráficos e indicadores gerados a partir dos dados registrados pelos treinadores.

## Tecnologias Utilizadas

### Frontend
- React
- Vite
- Recharts

### Backend
- Node.js
- Express

### Banco de Dados
- MySQL
- Prisma ORM

### PWA e Funcionamento Offline
- Service Worker
- LocalStorage

# Sistema de Acesso

## Cadastro de Treinador
- Nome completo
- E-mail
- Senha

## Cadastro de Atleta
- Nome completo
- Data de nascimento
- E-mail
- Senha

# Área do Atleta

## Busca de Equipe
- Pesquisa por código da equipe
- Solicitação de entrada

## Lobby do Atleta
- Visualização das equipes participantes
- Solicitação para novas equipes

## Página Inicial do Atleta
- Média de presença
- Quantidade de treinos
- Média de desempenho
- Gráfico de evolução
- Histórico de treinos

## Perfil
- Alterar foto
- Editar informações
- Visualizar equipes
- Sair de equipe

# Área do Treinador

## Lobby de Equipes
- Criar equipes
- Visualizar equipes
- Copiar códigos de acesso
- Gerenciar equipes

## Criação de Equipes
- Nome da equipe
- Modalidade esportiva
- Código único gerado automaticamente

## Áreas da Equipe
- Home
- Atletas
- Solicitações
- Treinos
- Configurações

# Home da Equipe

- Quantidade de atletas
- Quantidade de treinos
- Presença média
- Atleta em destaque
- Gráfico de evolução
- Informações do último treino

# Solicitações

- Aceitar atleta
- Recusar atleta

# Atletas

- Visualizar integrantes
- Editar número
- Editar posição
- Acessar perfil completo

# Perfil do Atleta

- Informações pessoais
- Presença média
- Quantidade de treinos
- Média de desempenho
- Gráfico de evolução
- Histórico de avaliações

# Treinos

## Cadastro de Treino

Campos obrigatórios:
- Data
- Tipo de treino

Tipos:
- Físico
- Coletivo
- Misto

Campo opcional:
- Descrição

## Registro de Presença

Todos os atletas serão considerados presentes automaticamente, sendo necessário alterar apenas os ausentes.

## Registro de Desempenho

As avaliações qualitativas iniciam com nota 5 (escala de 0 a 10) para todos os atletas.

O sistema permitirá que cada equipe defina critérios de avaliação específicos de acordo com sua modalidade esportiva.

### Futebol
- Finalização
- Passe
- Marcação
- Visão de jogo

### Vôlei
- Saque
- Recepção
- Bloqueio
- Levantamento

### Basquete
- Arremesso
- Assistências
- Defesa
- Controle de bola

Além dos critérios personalizados, poderão ser registradas métricas numéricas como:
- Gols
- Assistências
- Pontos
- Defesas
- Aces

As avaliações serão realizadas por meio de notas de 0 a 10 utilizando sliders.

## Histórico de Treinos

- Participantes
- Métricas registradas
- Avaliações realizadas

# Configurações

- Alterar dados da conta
- Alterar senha
- Logout
- Excluir conta

# Estrutura do Banco de Dados

O banco de dados será composto por entidades responsáveis pelo armazenamento de:
- Usuários
- Equipes
- Solicitações
- Treinos
- Presenças
- Avaliações
- Métricas esportivas

A estrutura do banco de dados será projetada de forma flexível, permitindo que cada equipe possua seus próprios critérios de avaliação e métricas esportivas.

# Diferenciais do Sistema

- Funcionamento offline para registro de treinos
- Instalação como PWA
- Entrada em equipes por código
- Participação em múltiplas equipes
- Registro simplificado de presença
- Métricas numéricas e qualitativas
- Interface mobile-first
- Dashboards com gráficos
- Suporte a diferentes modalidades esportivas

# Considerações Finais

O WebKore pretende oferecer uma solução prática para o acompanhamento do desempenho esportivo, permitindo que treinadores registrem informações importantes sobre seus atletas e que os próprios atletas acompanhem sua evolução ao longo do tempo.
