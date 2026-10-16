# Data de nascimento e idade automática

Implementação e verificações realizadas em 16/10/2026.

## Comportamento

- O cadastro de atleta exige Data de Nascimento; treinador continua sem essa exigência.
- O componente compartilhado usa o seletor nativo de data com `lang="pt-BR"`, limite até hoje e apresentação auxiliar explícita em DD/MM/AAAA. A aparência dos segmentos do seletor nativo segue a configuração regional do navegador/sistema.
- O frontend e a API rejeitam datas inexistentes, futuras e formatos diferentes de YYYY-MM-DD no transporte. Não há interpretação ambígua de DD/MM no backend.
- O banco guarda somente `User.birthDate`, como `DATE NULL`. Não se armazena idade fixa.
- Cadastro, login, GET/PATCH `/api/auth/me`, sessão do treinador e GET `/api/teams` preservam o campo. As projeções e permissões anteriores continuam em vigor.
- A lista e o perfil na área Atletas do treinador exibem a idade inteira. O cálculo usa dia, mês e ano; atualiza com a passagem do dia mesmo com a página aberta e ao retomar a aba.
- A data de referência usa America/Sao_Paulo tanto no navegador quanto no servidor. A API transporta YYYY-MM-DD e o adaptador Prisma usa meia-noite UTC, evitando deslocar o nascimento pelo fuso do dispositivo.
- Nascidos em 29/02 completam a idade em 01/03 nos anos sem 29/02 e em 29/02 nos anos bissextos.
- Contas antigas sem nascimento continuam podendo entrar e editar outros campos. O treinador vê “Idade não informada”; o atleta pode preencher o nascimento no próprio perfil. Não se inventam datas a partir de idades antigas.
- O modo local conserva birthDate entre sessões, valida novos cadastros e alterações e continua descartando o campo obsoleto age.

## Arquivos modificados ou criados

| Arquivo | Alteração |
| --- | --- |
| `shared/birthDate.js` | Validação, data de referência brasileira, cálculo e apresentação da idade. |
| `prisma/schema.prisma` | Campo `birthDate DateTime? @db.Date`. |
| `prisma/migrations/20261016010000_restore_birth_date/migration.sql` | Adiciona a coluna ausente ou converte a existente para DATE, preservando registros. |
| `server/src/lib/validacao.js` | Adapta validação compartilhada para HTTP 400 e data UTC do Prisma. |
| `server/src/lib/acesso.js` | Inclui birthDate na projeção autorizada de usuários. |
| `server/src/lib/serializadores.js` | Retorna YYYY-MM-DD ou null nos contratos de usuário e equipe. |
| `server/src/rotas/autenticacao.rotas.js` | Validação e persistência no cadastro e na atualização do perfil. |
| `src/componentes/ui/CampoNascimento.jsx` | Seletor reutilizável no cadastro e perfil, com apresentação brasileira. |
| `src/hooks/useTodayDate.js` | Atualização da data de referência com página aberta ou retomada. |
| `src/hooks/useWebKoreData.js` | Valida nascimento nas alterações, inclusive no modo local. |
| `src/paginas/PaginaLogin.jsx` | Campo obrigatório no cadastro de atleta. |
| `src/paginas/atleta/PerfilAtleta.jsx` | Permite preencher ou corrigir o nascimento. |
| `src/paginas/treinador/AtletasTreinador.jsx` | Idade calculada na lista e perfil do atleta. |
| `src/services/session.js` | Validação compartilhada e persistência no cadastro local. |
| `src/services/storage.js` | Preserva birthDate ao carregar e salvar dados locais. |
| `tests/birth-date.test.js` | Casos de calendário, validação, fuso e serialização. |
| `tests/session.test.js` | Cadastro local e conservação da data após restaurar sessão. |
| `tests/integration-check.js` | Cadastro, banco, login, leitura do treinador e contas sem data via API/MySQL. |
| `README.md` | Referência a este relatório e às instruções de migração. |
| `Documentação/data-nascimento.md` | Relatório e instruções de implantação. |

## Banco deste ambiente

O MySQL configurado em localhost:3306/webkore já possuía `birthDate DATETIME NULL`, sem valores preenchidos nas três contas existentes. A migration histórica `20260922010000_remove_birth_date` estava pendente e apagaria essa coluna.

Ela foi marcada como aplicada usando `prisma migrate resolve --applied`, sem executar seu DROP COLUMN. O arquivo histórico não foi alterado. Em seguida, `prisma migrate deploy` aplicou `20261016010000_restore_birth_date`, convertendo a coluna para `DATE NULL`.

A conferência posterior confirmou a coluna DATE, as três contas preservadas e nenhuma migration pendente. Os dados temporários dos testes de integração foram removidos pelo próprio teste, restritos aos IDs criados nessa execução. Não foi executado reset ou seed.

## Implantação em outros ambientes

Neste banco não há comando de migration pendente. Reinicie a API em execução para carregar o código e o client atualizados.

Em outro banco, confira primeiro:

```sh
npx prisma migrate status
```

Se a coluna birthDate ainda existir **e** `20260922010000_remove_birth_date` estiver pendente, preserve-a marcando somente essa migration histórica como aplicada, sem executar a remoção:

```sh
npx prisma migrate resolve --applied 20260922010000_remove_birth_date
```

Não repita o resolve se ela já estiver aplicada. Depois execute:

```sh
npx prisma migrate deploy
npm run prisma:generate
npm run build
```

A nova migration também atende bancos nos quais a remoção antiga já ocorreu: nesse caso adiciona birthDate com null para os registros antigos. Datas apagadas anteriormente não são recuperadas automaticamente.

## Testes executados

- `npm test`: 13 testes aprovados. Inclui antes/no dia/depois do aniversário, zero e um ano, 31/12 e 01/01, 29/02 em anos bissextos e comuns, regras de 1900/2000, datas futuras/inexistentes, nulos, formatos inválidos, meia-noite brasileira, modo local e regressões existentes.
- `npm run test:integration -- 7`: aprovado com Express/Prisma/MySQL reais. Verificou criação do atleta, valor armazenado, login, sessão, consulta de equipes pelo treinador, rejeição HTTP 400 e conta antiga sem data, incluindo atualização posterior. Também passou pelos cenários anteriores de permissões, equipes, treinos e notas.
- `npm run prisma:generate`: aprovado.
- `npx prisma validate`: aprovado.
- `npx prisma migrate deploy`: migration aplicada.
- `npx prisma migrate status`: banco atualizado, sem pendências.
- `npm run build`: aprovado, incluindo geração do service worker PWA. A primeira tentativa foi limitada pelo sandbox; a execução autorizada fora dele concluiu. Permanecem avisos do projeto sobre bundle maior que 500 kB, externalização de crypto do bcryptjs e configuração Prisma no package.json.
- `git diff --check`: aprovado.

Não foi realizado teste visual interativo no navegador; cadastro e fluxo de dados foram exercitados pela camada de serviços do frontend e pelos endpoints reais.
