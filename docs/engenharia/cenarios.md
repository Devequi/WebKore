# Análise de Cenários

## Tabela Comparativa dos Cenários

| Aspecto | Cenário Otimista (Melhor caso) | Cenário Realista (Caso provável) | Cenário Pessimista (Pior caso) |
| :--- | :--- | :--- | :--- |
| **Adoção do Sistema** | Treinadores e atletas usam diariamente com entusiasmo. | Treinadores usam sempre, mas alguns atletas esquecem de olhar. | Forte resistência; preferência por prancheta e papel. |
| **Uso da Internet** | Conexão estável nos locais de treino; dados sobem na hora. | Internet oscila um pouco, mas os dados são salvos sem grandes atrasos. | Sinal de internet inexistente ou muito ruim na maioria dos treinos. |
| **Qualidade dos Dados** | Dados inseridos perfeitamente e gráficos 100% precisos. | Erros ocasionais de digitação que são corrigidos depois. | Dados incompletos ou ignorados, gerando gráficos vazios. |
| **Futuro do Projeto** | Expansão rápida para novos clientes e criação de IA. | Sistema atende bem o cliente atual e planeja versão offline. | Projeto corre risco de abandono se não mudar a estratégia. |

---

## Detalhamento e Planos de Ação

### Cenário Otimista
Neste cenário, tudo corre da melhor forma possível. O cliente abraça a ideia imediatamente, e a transição do papel para o digital é um sucesso total.
* **Comportamento:** Os treinadores alimentam o sistema logo após os treinos e os atletas acompanham seus gráficos de evolução de casa, sentindo-se mais motivados. A internet do local funciona perfeitamente.
* **Ação do Projeto:** Aproveitar o sucesso para acelerar os planos de expansão. É o momento de começar a desenhar a integração com Inteligência Artificial e buscar novas academias ou escolinhas parceiras.

### Cenário Realista
Este é o cenário mais provável para o início do projeto. As coisas funcionam bem, mas exigem um período natural de adaptação dos usuários.
* **Comportamento:** O treinador usa a plataforma como sua ferramenta principal, mas no começo pode esquecer de registrar um treino ou outro. Alguns atletas demoram um pouco mais para pegar o hábito de acessar o painel. A internet oscila de vez em quando, mas o treinador espera o sinal voltar ou atualiza o sistema quando chega em casa.
* **Ação do Projeto:** Criar um canal de suporte simples para ouvir o feedback dos usuários. Criar avisos visuais no sistema para lembrar o treinador de preencher os dados pendentes e focar na melhoria contínua do design.

### Cenário Pessimista
Neste cenário, o projeto enfrenta sérias barreiras de uso e corre o risco de não ser utilizado na prática.
* **Comportamento:** Os treinadores acham chato ter que digitar os dados no celular ou computador e voltam a usar a prancheta de papel. Para piorar, a falta de sinal de internet no campo ou na quadra impede o uso do sistema online no momento do treino, gerando frustração.
* **Plano de Mitigação (O que fazer para reverter):**
  1. **Treinamento presencial:** Sentar com o cliente e fazer um treinamento prático, mostrando como o sistema vai economizar tempo dele no fim do mês.
  2. **Simplificação extrema:** Reduzir o número de campos obrigatórios para o cadastro de métricas, deixando o preenchimento o mais rápido possível (ex: botões de clique em vez de digitação).
  3. **Mudança de Escopo Urgente:** Colocar como prioridade máxima no código o desenvolvimento de um sistema de salvamento local (offline/PWA), para que o treinador possa usar a plataforma mesmo sem internet e os dados sincronizem sozinhos quando ele se conectar novamente.