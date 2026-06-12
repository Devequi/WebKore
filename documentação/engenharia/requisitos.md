## Módulo de Autenticação

| ID   | Nome do Requisito       | Descrição                                                                             |
| ---- | ----------------------- | ------------------------------------------------------------------------------------- |
| RF01 | Cadastro de Treinadores | O sistema deve permitir o cadastro de treinadores informando nome, e-mail e senha.    |
| RF02 | Login de Treinadores    | O sistema deve permitir o login de treinadores utilizando e-mail e senha.             |
| RF03 | Cadastro de Atletas     | O sistema deve permitir o cadastro de atletas informando nome, idade, e-mail e senha. |
| RF04 | Login de Atletas        | O sistema deve permitir o login de atletas utilizando e-mail e senha.                 |

## Módulo de Equipes

| ID   | Nome do Requisito             | Descrição                                                                                    |
| ---- | ----------------------------- | -------------------------------------------------------------------------------------------- |
| RF05 | Criação de Equipes            | O sistema deve permitir que o treinador crie equipes informando nome e modalidade esportiva. |
| RF06 | Geração de Código da Equipe   | O sistema deve gerar automaticamente um código único para cada equipe criada.                |
| RF07 | Compartilhamento de Código    | O sistema deve permitir ao treinador compartilhar o código da equipe.                        |
| RF08 | Busca de Equipe por Código    | O sistema deve permitir que atletas busquem equipes através do código de acesso.             |
| RF09 | Solicitação de Entrada        | O sistema deve permitir que atletas solicitem entrada em uma equipe.                         |
| RF10 | Aprovação de Solicitações     | O sistema deve permitir que treinadores aceitem ou recusem solicitações de entrada.          |
| RF11 | Lobby de Equipes do Treinador | O sistema deve exibir ao treinador uma lista com todas as equipes sob sua responsabilidade.  |
| RF12 | Lobby de Equipes do Atleta    | O sistema deve exibir ao atleta uma lista das equipes às quais ele pertence.                 |

## Módulo de Atletas

| ID   | Nome do Requisito          | Descrição                                                                                    |
| ---- | -------------------------- | -------------------------------------------------------------------------------------------- |
| RF13 | Visualização do Elenco     | O sistema deve permitir que o treinador visualize o elenco completo de uma equipe.           |
| RF14 | Perfil do Atleta           | O sistema deve permitir que o treinador visualize o perfil detalhado de um atleta.           |
| RF15 | Edição de Dados Esportivos | O sistema deve permitir a edição de informações esportivas do atleta, como posição e número. |
| RF16 | Edição de Perfil do Atleta | O sistema deve permitir que atletas visualizem e editem seus próprios dados cadastrais.      |
| RF17 | Saída de Equipe            | O sistema deve permitir que atletas saiam de uma equipe vinculada.                           |

## Módulo de Treinos

| ID   | Nome do Requisito      | Descrição                                                                                     |
| ---- | ---------------------- | --------------------------------------------------------------------------------------------- |
| RF18 | Cadastro de Treinos    | O sistema deve permitir o cadastro de treinos contendo data, tipo e descrição.                |
| RF19 | Registro de Presença   | O sistema deve permitir o registro de presença dos atletas em cada treino.                    |
| RF20 | Lançamento de Métricas | O sistema deve permitir o lançamento de métricas esportivas específicas para cada modalidade. |
| RF21 | Avaliação de Atletas   | O sistema deve permitir o lançamento de avaliações qualitativas dos atletas.                  |
| RF22 | Histórico de Treinos   | O sistema deve manter um histórico completo dos treinos realizados.                           |

## Módulo de Dashboards

| ID   | Nome do Requisito    | Descrição                                                                                  |
| ---- | -------------------- | ------------------------------------------------------------------------------------------ |
| RF23 | Dashboard da Equipe  | O sistema deve apresentar um dashboard geral da equipe contendo indicadores de desempenho. |
| RF24 | Dashboard Individual | O sistema deve apresentar dashboards individuais para cada atleta.                         |
| RF25 | Gráficos de Evolução | O sistema deve exibir gráficos de evolução de desempenho dos atletas.                      |

## Módulo de Configurações

| ID   | Nome do Requisito               | Descrição                                                                      |
| ---- | ------------------------------- | ------------------------------------------------------------------------------ |
| RF27 | Alteração de Dados do Treinador | O sistema deve permitir que treinadores alterem seus dados cadastrais e senha. |
| RF28 | Alteração de Dados do Atleta    | O sistema deve permitir que atletas alterem seus dados cadastrais e senha.     |
| RF29 | Logout                          | O sistema deve permitir que usuários realizem logout.                          |
| RF30 | Exclusão de Conta               | O sistema deve permitir a exclusão da conta do usuário.                        |

---

## Requisitos Não Funcionais (RNF)

| ID    | Nome do Requisito              | Descrição                                                                                                        | Categoria        |
| ----- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ---------------- |
| RNF01 | Mobile First                   | O sistema deve ser desenvolvido seguindo a abordagem Mobile First.                                               | Usabilidade      |
| RNF02 | Interface Intuitiva            | O sistema deve possuir interface intuitiva e de fácil utilização.                                                | Usabilidade      |
| RNF03 | Compatibilidade de Navegadores | O sistema deve funcionar corretamente nos navegadores Google Chrome, Microsoft Edge e Mozilla Firefox.           | Compatibilidade  |
| RNF04 | Tempo de Resposta              | As principais operações do sistema devem ser executadas em até 2 segundos em condições normais de uso.           | Desempenho       |
| RNF05 | Escalabilidade                 | O sistema deve suportar pelo menos 50 usuários simultâneos sem perda significativa de desempenho.                | Escalabilidade   |
| RNF06 | Arquitetura REST               | A comunicação entre frontend e backend deve ocorrer através de APIs REST.                                        | Arquitetura      |
| RNF07 | Responsividade                 | A interface deve adaptar-se automaticamente a smartphones, tablets e computadores.                               | Responsividade   |
| RNF08 | Controle de Acesso             | O sistema deve restringir o acesso aos dados conforme o perfil do usuário.                                       | Segurança        |
| RNF09 | Segurança de Autenticação      | As senhas devem ser armazenadas utilizando criptografia por hash e autenticação via JWT.                         | Segurança        |
| RNF10 | Disponibilidade                | O sistema deve garantir disponibilidade durante os períodos de utilização da plataforma.                         | Confiabilidade   |
| RNF11 | Manutenibilidade               | O código-fonte deve seguir uma arquitetura modular para facilitar manutenção e evolução do sistema.              | Manutenibilidade |
| RNF12 | Flexibilidade de Modalidades   | O sistema deve permitir a inclusão de novas modalidades esportivas sem alterações significativas na arquitetura. | Flexibilidade    |
| RNF13 | Conformidade com a LGPD        | O sistema deve atender aos princípios da LGPD para proteção dos dados dos usuários.                              | Legal            |
| RNF14 | Banco de Dados Relacional      | O sistema deve utilizar banco de dados relacional para armazenamento persistente das informações.                | Arquitetura      |
| RNF15 | Visualização de Dashboards     | Os dashboards devem apresentar gráficos de forma clara e compreensível para treinadores e atletas.               | Usabilidade      |
