# WebKore

Plataforma web para gestão e acompanhamento de desempenho esportivo.

O WebKore permite que treinadores criem equipes, gerenciem atletas, registrem treinos e acompanhem métricas de desempenho. Atletas podem entrar em equipes através de código, visualizar seus dados, presença, histórico e evolução.

O projeto utiliza React no frontend, Express no backend e MySQL com Prisma para persistência dos dados.

---

## Tecnologias

### Frontend

- React
- Vite
- JavaScript
- Recharts
- Lucide React
- LocalStorage para o token de autenticação

### Backend

- Node.js
- Express
- Prisma ORM
- MySQL
- JWT
- bcrypt

---

## Arquitetura

O frontend usa `useWebKoreData` e `src/services/api.js` para cadastro, login,
equipes, vínculos, treinos e avaliações. A API é a fonte dos dados das sessões
autenticadas no servidor. JWT é enviado como Bearer; `/auth/me` restaura a sessão.
O backend limita equipes e registros conforme a conta e o perfil autenticados.

O sistema depende da API para cadastro, login, restauração de sessão e operações
esportivas. Falhas de conexão são exibidas ao usuário; não há fallback de login,
cadastro ou gravação local. O token continua no localStorage para permitir nova
consulta autenticada após recarregar a página. As consultas usam `no-store`.

Bases locais e filas legadas permanecem intactas no navegador para recuperação
manual, sem serem carregadas ou sincronizadas pela aplicação. Somente as cópias
antigas de consultas da API e os metadados redundantes de sessão são removidos.
As demonstrações explícitas por seed no MySQL continuam disponíveis.

O build não contém manifest, instalação ou suporte offline. `public/sw.js` é
exclusivamente um worker de desativação na URL antiga: limpa os caches próprios,
desregistra-se e atualiza as páginas antigas do WebKore. O frontend nunca o registra.
Veja o [relatório da auditoria](Documentação/auditoria-geral.md) para implantação
e validação da transição de instalações anteriores.

O backend possui o seguinte fluxo:

```text
React
  ↓
API HTTP
  ↓
Express
  ↓
Prisma
  ↓
MySQL
```

## Execução local

Use Node.js 22.12 ou superior e npm. As dependências são compartilhadas pelo
frontend e pelo backend no `package.json` da raiz.

1. Instale as dependências com `npm ci`.
2. Se ainda não existir um `.env`, copie `.env.example` para `.env` e preencha
   `DATABASE_URL` e `JWT_SECRET` com valores locais. Não sobrescreva seu `.env` existente.
3. Execute `npm run prisma:generate` para gerar o client do Prisma.
4. Inicie o frontend com `npm run dev` e, em outro terminal, a API com `npm run api`.

O frontend abre em `http://127.0.0.1:5173` e a API usa a porta configurada em
`PORT` (padrão 3333). `GET /api/health` verifica se a API está respondendo;
não verifica a conexão com o banco. Novos cadastros e logins utilizam a API
quando o servidor está disponível.

`VITE_API_URL` configura a URL do serviço HTTP do frontend e pode usar o padrão
`http://localhost:3333/api`. Variáveis com prefixo `VITE_` são públicas no build;
nunca use esse prefixo para credenciais.

`SEED_PASSWORD` é necessária apenas para `npm run prisma:seed`. Ela define a
senha das contas de demonstração criadas pelo seed; contas existentes não são
atualizadas por esse script. Execute o seed apenas em um banco de demonstração.

O schema e as migrations existentes foram preservados. Antes de aplicar
migrations em um banco com dados, revise seu conteúdo e mantenha um backup.

O cadastro de atleta exige data de nascimento e a área Atletas do treinador
calcula a idade automaticamente. Consulte [Data de nascimento e idade](Documentação/data-nascimento.md)
para os arquivos alterados, testes e instruções de migration. Se a coluna
`birthDate` ainda existir e a migration antiga `remove_birth_date` estiver
pendente, siga as instruções de resolução antes de aplicar migrations para preservar a coluna.

## Verificações

### Banco exclusivo de desenvolvimento/testes

`npm run prisma:seed:test` cria ou atualiza as fixtures abaixo sem limpar o banco.
Para substituir todos os registros dos sete models pelo cenário de testes, use
`npm run prisma:seed:test -- --clear`. Esse comando apaga registros na ordem
Evaluation, SportMetric, TrainingRecord, Training, Membership, Team, User e cria
as fixtures na mesma transação. Não altera schema, tabelas, relações ou migrations.
Use somente em banco de desenvolvimento/teste; o modo recusa NODE_ENV=production.
O seed de demonstração anterior continua disponível em `npm run prisma:seed`.

| Perfil | Nome | E-mail | Senha de teste |
| --- | --- | --- | --- |
| Treinador | Treinador Teste | treinador@webkore.test | Teste123! |
| Atleta | Atleta Teste | atleta@webkore.test | Teste123! |
| Atleta | Atleta Dois | atleta2@webkore.test | Teste123! |

Essas credenciais são públicas e exclusivas de testes. O seed grava somente hashes
bcrypt com custo 10, igual ao backend. Reexecutar o modo de testes restaura essas
senhas e os valores das fixtures. Não copie essas contas para produção.

Equipe **WebKore Teste**, modalidade **Vôlei**, código **WK-TEAM-100**. Atleta Teste
é APPROVED; Atleta Dois é PENDING. Treino misto em 30/09/2026 com presença do primeiro
atleta, Pontos=4, Aces=1 e notas Técnica=0, Condicionamento físico=6,
Participação=8, Trabalho em equipe=7.

### Comandos de verificação

- `npm run build`: build do frontend convencional, com páginas carregadas sob demanda.
- `npm run test:build`: verifica o build e a ausência de artefatos ativos do PWA.
- `npm test`: sessão conectada, transição PWA, nascimento, contratos, CSV, notas e proteção do seed, sem banco.
- `npm run test:integration -- 7`: integração com o MySQL configurado; cria fixtures
  exclusivas e remove somente seus IDs no finally. Não execute em produção.
- `npx prisma validate`: validação do schema.
- `npm run prisma:generate`: geração do client, sem aplicar migrations.

Não há lint configurado. O relatório atual de problemas, correções, arquivos,
testes e implantação está em [Documentação/auditoria-geral.md](Documentação/auditoria-geral.md).
As revisões anteriores foram mantidas como histórico.
