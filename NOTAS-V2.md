# Notas v2 — branch codex/notas-contextuais-v2

## Testar

`npm run dev` abre a versão desta branch. Ao vivo → escolher ação → escolher jogador. As ações novas já usam a versão 2. Um jogo existente pode misturar versões; o relatório avisa. Para comparar somente v2, iniciar outra partida preservando o histórico ou usar um perfil separado do navegador.

Ataque → seletor mostra Rede, Fundo/pipe Z6 e Fundo/saída Z1. A origem do ataque não aumenta a dificuldade automaticamente. Escolher dificuldade e, se necessário, Detalhar → Execução individual. Pipe/saída bloqueiam a seleção de jogadores da rede e líbero.

Ajustes → Notas por função → Central que permanece no fundo. Opções: automático com recepção/defesa, defesa sem linha de passe, ou pesos convencionais. O perfil de fundo e seus pesos são ajustáveis e separados da troca automática de líbero. Função, zona de rotação, contexto e pesos são gravados na ação; mudanças de ajuste afetam registros futuros.

## Avaliação

| Execução | Fácil | Normal | Difícil | Emergência |
|---|---:|---:|---:|---:|
| Erro direto | 0 | 1 | 2 | 3 |
| Gafe com continuidade | 2 | 3 | 4 | 5 |
| Neutra | 5 | 5 | 5 | 5 |
| Boa | 6,5 | 7,5 | 8,5 | 9 |
| Excelente | 8 | 9 | 9,5 | 10 |
| Ponto bem executado | 9 | 9 | 9,5 | 10 |

Infração confirmada e erro explicitamente evitável recebem zero. Saque ignora dificuldade: erro 0, ruim 3,5, neutro 5, bom 7, excelente/fora do sistema 8,5, ace 9. Dificuldade é a condição prévia da bola, não o erro provocado pelo próprio jogador. Salvadas ajustam dificuldade; não há bônus acumulados. Decisão marcada explicitamente tem dedução limitada a 0,5 na avaliação da ação.

Detalhes do bloqueio distinguem toque simples, efetivo, perfeito, usado e atrasado. Cada participante recebe avaliação própria, sem a antiga redução de 65%. Sem responsabilidade ou sem possibilidade real fica fora da nota. O placar é independente da execução: perder o rally não obriga o jogador a receber uma execução ruim. Largadinha selecionada no levantamento passa a ser um ataque do levantador.

## Agregação e amostra

Cada fundamento é uma média das qualidades observadas. Aplica-se o peso do fundamento, normalizando somente os fundamentos com ações e peso positivo. Não há três ações fictícias de nota 5 nem penalidade dupla do mesmo erro. Uma ação boa normal e vinte ações boas normais recebem 7,5; a quantidade muda a indicação de amostra.

Para períodos com funções ou cobertura diferentes, calculam-se médias separadas e combinam-se pelos rallies observados em cada contexto. Não é uma estimativa de todos os rallies em que o atleta esteve em quadra: apenas os que possuem registros de execução. Toques adicionais no mesmo rally não multiplicam o peso desse período. Por totais, não há sequência nem duração dos períodos; contextos informados têm igual influência, sem inventar tempo em quadra.

Amostra inicial (<5): nota provisória. Intermediária (5–14) e ampliada (15+). Esses rótulos descrevem quantidade de registros, não uma probabilidade estatística de certeza. Melhor/pior fundamento mostram número de ações e qualidade. Ausência de registros não é zero.

## Pesos padrão

| Função | Saque | Recepção | Levantamento | Ataque | Bloqueio | Defesa |
|---|---:|---:|---:|---:|---:|---:|
| Levantador | 15 | 5 | 45 | 5 | 10 | 20 |
| Ponteiro | 10 | 25 | 5 | 35 | 10 | 15 |
| Oposto | 15 | 5 | 5 | 45 | 15 | 15 |
| Central | 15 | 5 | 5 | 35 | 35 | 5 |
| Líbero | 0 | 45 | 10 | 0 | 0 | 45 |
| Central no fundo | 20 | 30 | 10 | 5 | 0 | 35 |

Pesos personalizados anteriores são respeitados. Configurações iguais aos antigos padrões são apresentadas nos novos padrões v2. Os valores são uma calibração inicial para o time, não uma escala científica universal.

## Compatibilidade

Eventos v1 e sem contexto preservam a fórmula anterior; arquivos antigos continuam restauráveis. Resumos históricos permanecem com notas gravadas. Em um jogo misto, notas v1 e v2 são combinadas proporcionalmente às ações avaliadas de cada versão; portanto, a independência de volume vale integralmente para jogos só v2. O relatório identifica esse caso.

Pós-jogo completo usa o mesmo motor do ao vivo. Novas fichas por totais usam v2 e permitem linhas separadas de central de rede/fundo. Fichas antigas conservam sua versão. JSON mantém contexto e versão. A página pública recebe notas calculadas sem expor os pesos e a auditoria privados.

## Validação

Testes cobrem invariância ao volume, dificuldade, saque, infrações, bloco, responsabilidades coletivas, ataque do fundo, contexto de central/líbero, serialização, correção/desfazer, pós-jogo e público. Os coeficientes ainda devem ser confrontados com observações reais da comissão.
