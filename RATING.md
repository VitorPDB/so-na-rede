# Notas contextuais · versão 1

Ao vivo: resultado → mini quadra. Normal é o padrão; pontos comuns continuam em dois toques. Ajuste dificuldade, abra “Contexto e execução” para etiquetas opcionais, ou escolha Participação para jogadas ensaiadas e bloqueios duplos/triplos. Cada participante tem execução própria; jogadas ensaiadas também permitem fundamentos e dificuldades diferentes. A função vem da formação naquele momento.

## Contribuição da ação

`contribuição = 0,5 + (qualidade − 0,5) × fator`, limitada a 0–1.

| Bola       | Fator para qualidade ≥ 0,5 | Fator para qualidade < 0,5 | Totalmente boa | Totalmente ruim |
| ---------- | -------------------------: | -------------------------: | -------------: | --------------: |
| Fácil      |                       0,55 |                       1,10 |          77,5% |              0% |
| Normal     |                       0,75 |                       0,90 |          87,5% |              5% |
| Difícil    |                       0,95 |                       0,50 |          97,5% |             25% |
| Emergência |                       1,08 |                       0,28 |           100% |             36% |

50% é referência neutra. Percentuais representam um índice de execução ajustado, não a taxa bruta de acertos. Resultados neutros permanecem neutros. Dificuldade não recompensa uma execução ruim.

Etiquetas de trajetória, técnica e bloqueio adversário descrevem contexto; não dão bônus automático. Etiquetas de execução refinam a qualidade: toque simples 0,55; efetivo 0,8; perfeito 1; bloqueio explorado 0,4; atrasado 0,15; ausência evitável 0; direção fechada sem toque 0,7. “Não bloqueou tendo condição” não deve ser usado para impossibilidade ou decisão tática.

Salvada difícil utiliza dificuldade Difícil; muito difícil utiliza Emergência, sem outro bônus pela mesma dificuldade. “Tirou da cartola” tem bônus de até 0,08, somente com qualidade positiva. Entra no máximo um bônus e uma penalidade de decisão, sem acumular etiquetas pelo mesmo mérito. Erros não se tornam bons por receberem etiqueta positiva.

## Jogadas coletivas

Jogada ensaiada: 2–6 participantes. Bloqueio duplo/triplo: exatamente 2/3 jogadores da rede. Acertou equivale a qualidade 1; Parcial a 0,5; Errou a 0; Sem responsabilidade não entra na nota individual. Cada contribuição usa a dificuldade individual ou, se não informada, a dificuldade da jogada. O erro de um não altera a execução de outro.

Crédito positivo individual é reduzido a 65% da distância acima de 0,5. Erros mantêm o ajuste de dificuldade. O ponto conta uma vez no placar e só o finalizador que acertou recebe crédito estatístico de ponto. Etiquetas do finalizador não são transferidas aos parceiros. Registre a jogada coletiva **no lugar** de registrar as mesmas execuções individualmente.

## Nota final e compatibilidade

`qualidade suavizada = (soma das contribuições + 1,5) / (quantidade + 3)`

As médias por fundamento são combinadas pelos pesos configuráveis da função histórica, normalizados entre fundamentos observados, e convertidas para 0–10. Três observações neutras suavizam amostras pequenas. Ações novas não recebem outra penalidade por erro: o custo já está na contribuição. “Penalidade extra · registros antigos” mantém o cálculo anterior para ações sem contexto.

Registros anteriores sem `assessment` e resumos históricos mantêm a fórmula/notas originais. Ajustar um detalhe de uma ação anterior ativa o cálculo contextual nessa ação, com auditoria. Correções e desfazer restauram avaliações; reiniciar set também remove as contribuições contextuais desse set.

JSON guarda todos os detalhes. CSV de eventos inclui contexto e participantes. Pós-jogo completo tem os mesmos controles; rascunhos coletivos incompletos são preservados, mas não podem ser aplicados até corrigidos. Nos totais, filtros de dificuldade/situação guardam quantidades separadas; trocar o filtro não apaga dados. Use a ficha completa para várias etiquetas ou participantes.

Estes fatores são uma proposta inicial, a calibrar com jogos reais e classificações consistentes da comissão.
