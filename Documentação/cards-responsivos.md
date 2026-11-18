# Cards responsivos — WebKore

## Ajustes

`src/componentes/ui/CardGrid.jsx` e `src/styles/CardGrid.css` centralizam a distribuição e a escala dos cards existentes. O componente cria uma região de tamanho consultável, para que cada grid se adapte à largura real disponível dentro de um painel, independentemente da resolução do monitor e da presença da barra lateral.

Foram removidas regras locais que reduziam cards e ícones a tamanhos diferentes em cada tela, incluindo os mínimos de 7–8 rem para colunas de métricas. O componente `KpiCard` mantém seus dados e sua estrutura; o estilo compartilhado padroniza padding, alinhamento, ícones, rótulos, valores e textos auxiliares.

Os cards de resumo têm altura mínima de 112 px em regiões estreitas e 136 px nas demais. As métricas têm mínimo de 120 px; a altura cresce com o conteúdo, sem corte de rótulos ou detalhes. Os ícones variam de 36 a 44 px. Os valores principais variam aproximadamente de 25 a 36 px; as métricas secundárias usam uma escala menor. A paleta, as bordas e a identidade visual foram preservadas.

## Grids e breakpoints

Os valores abaixo representam a largura **da região do grid**, não a largura da janela. Consideram a base atual de 16 px por rem e continuam proporcionais caso essa base mude.

| Tipo | Colunas e limites |
| --- | --- |
| Resumo de três indicadores | 1 abaixo de 34 rem (544 px), 2 a partir de 34 rem, 3 a partir de 52 rem (832 px) |
| Resumo de quatro indicadores | 1 abaixo de 34 rem, 2 até 64 rem, 4 a partir de 64 rem (1024 px), evitando uma linha órfã de um único card |
| Indicadores principais de desempenho | 1 abaixo de 28 rem (448 px), 2 a partir desse limite |
| Métricas específicas | 1 abaixo de 28 rem, 2 a partir de 28 rem e 3 a partir de 46 rem (736 px); nunca cinco métricas na mesma linha |

Os painéis Desempenho — Linha e Desempenho — Goleiros passam a ficar lado a lado somente quando o conteúdo do dashboard chega a 64 rem, em vez de 49 rem. Média e Avaliações vêm primeiro, com borda superior de destaque; as estatísticas e medidas específicas ficam abaixo. A média também aparece no painel de desempenho das outras modalidades.

A partir de 1600 px de viewport, o conteúdo principal e os lobbies podem chegar a 1840 px, com margens internas e espaçamento maiores. O conteúdo não cresce indefinidamente em monitores ultrawide. Cards de equipe preenchem suas colunas, sem o antigo limite interno fixo de 420 px; listas não esticam um único card por toda a tela.

## Telas cobertas

- Área inicial do treinador: Equipes, Atletas e Modalidades.
- Dashboard de equipe: quatro indicadores gerais, desempenho de linha e goleiros, demais modalidades e resumo do último treino.
- Dashboard do atleta: presença, treinos, média e resumo de desempenho.
- Perfil esportivo no elenco: KPIs de presença, treinos e desempenho.
- Estatísticas de linha e goleiro: os mesmos grids em painéis individuais e consultas contextuais.

Não houve alteração de cálculos, filtros, permissões, registros, API ou persistência. Gráficos e interações existentes foram preservados.

## Validação

- `npm test`: 85 testes aprovados, incluindo cálculos, componentes, avaliações, sessão, rotas e permissões da API.
- `npm run build` e `npm run test:build`: build e checagem dos artefatos.
- Dashboard de equipe conferido no navegador em 360 × 800, 768 × 1024, 1024 × 900, 1366 × 900, 1920 × 1080 e 2560 × 1440.
- Dashboard do atleta conferido em 360 e 1920 px; resumo inicial de três indicadores conferido em 768 e 1366 px.
- Inspeção visual e medição do DOM sem overflow horizontal da página ou textos de cards cortados nos cenários conferidos. Incluídos rótulos longos, números com quatro dígitos, porcentagens e estado Sem dados.

O cenário reproduzível está em `/tests/cards-preview.html`, servido por `npm run dev`. `?mode=lobby` mostra a área inicial e `?mode=athlete` o dashboard do atleta; sem parâmetro, mostra o dashboard de futsal. Essa página usa componentes reais com fixtures exclusivamente visuais, sem API, armazenamento ou alteração de dados. Ela não faz parte do build de produção.
