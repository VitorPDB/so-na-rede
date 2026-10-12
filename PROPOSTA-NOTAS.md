# Proposta de notas — 11/10/2026

Proposta para aprovação; a fórmula atual não foi substituída nesta atualização.

## Conclusão

Usar valores claros de qualidade por ação, ajustados pela dificuldade, e agregá-los por média ponderada por fundamento e responsabilidade. Não somar/subtrair uma quantidade fixa diretamente da nota geral nem multiplicar a nota atual por percentuais. Uma soma favorece volume de contatos e duração da partida; percentuais aplicados à nota corrente tornam o resultado dependente da ordem das ações.

Os percentuais continuam úteis como pesos dos fundamentos, não como descontos sobre a nota atual. A eficiência de ataque (pontos menos erros dividido por tentativas) deve aparecer separadamente como estatística objetiva, sem substituir a avaliação de todos os fundamentos.

## Modelo sugerido

1. Resultado observado: erro que encerra, gafe com continuidade, continuidade neutra, ação boa e ação excelente. Uma largada forçada que mantém o rally não equivale a um erro de ataque.
2. Dificuldade ANTES da execução: fácil, normal, difícil e emergência. Classificar pela bola disponível e pelo bloqueio, não porque o jogador executou mal.
3. Responsabilidade: individual, compartilhada ou sem culpa atribuível. Não descontar duas vezes o mesmo erro. Em bloqueios conjuntos, manter avaliação individual.
4. Pontuação de qualidade limitada a 0–1; maior recompensa por boa execução difícil e maior custo por falha fácil. Coeficientes iniciais são decisão de produto, a calibrar com jogos do time; não existe uma tabela universal de notas 0–10 validada para o Só na Rede.
5. Média por fundamento, pesos por função e contexto; considerar somente fundamentos observados. Exibir quantidade de ações e indicação de amostra pequena. Um atleta sem registros fica sem nota, não com zero.
6. Suavização para poucas ações: (soma de qualidades + k × referência) / (tentativas + k). O sistema atual usa referência 0,5 e k=3; estes números precisam ser calibrados antes de mudar.

## Central sem líbero

Adicionar “Avaliar central que permanece no fundo”, com pesos ajustáveis de recepção e defesa. Registrar em cada ação a função, zona de rotação e contexto de cobertura naquele instante. Ativar o perfil de fundo quando um central está nas zonas 1/5/6 sem ser substituído pelo líbero, inclusive se a troca automática estiver ligada mas ele ainda permanecer em quadra.

Não transformar o central em líbero: preservar seu perfil de ataque/bloqueio quando volta à rede. Mudanças de cobertura não devem reclassificar retrospectivamente ações. O contexto deve vir da rotação, não da zona onde a bola foi defendida. No pós-jogo, permitir especificar períodos e responsabilidade de fundo; sem essa informação, informar que o contexto é desconhecido.

Exemplo de pesos candidatos para período de fundo: recepção 30%, defesa 35%, saque 20%, levantamento 10%, ataque 5%. Bloqueio não é esperado no fundo. Na rede, manter o perfil de central. Esses percentuais são proposta inicial, não achado científico, e não foram aplicados.

## Validação com o time

Comparar 3–5 jogos com duas pessoas avaliando uma amostra dos mesmos rallies. Procurar divergências de dificuldade e responsabilidade; ajustar descrições antes dos coeficientes. Conferir se repetir a mesma proporção de bons/maus contatos não produz um bônus artificial de volume. Verificar separadamente centrais de rede/fundo, levantadores, ponteiros, opostos e líbero. Dados de elite explicam relações entre funções e ações; não devem impor diretamente padrões de eficiência a uma equipe amadora.

## Fontes primárias consultadas

- [FIVB — The Game](https://www.fivb.com/volleyball/the-game/): funções do levantador e líbero, recepção e defesa de fundo.
- [NCAA — Official Volleyball Statistics Rules, 2025](https://fs.ncaa.org.s3.amazonaws.com/Docs/stats/Stats_Manuals/Volleyball.pdf): tentativas, pontos e erros de ataque; padronização dos registros.
- [Characteristics of Serve, Reception and Set That Determine the Setting Efficacy in Men's Volleyball](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.00222/full): estudo de 1.371 sequências, relações entre qualidade da recepção e eficácia do levantamento; ressalva de amostra de alto nível.
- [Participation in terminal actions according to the role of the player and his location on the court](https://www.tandfonline.com/doi/abs/10.1080/24748668.2015.11868818): resumo consultado; distingue função e localização rede/fundo. Não se utilizou conteúdo pago indisponível.
- [Intra and Interzone Differences of Attack and Counterattack Efficiency in Elite Male Volleyball](https://pmc.ncbi.nlm.nih.gov/articles/PMC6341958/): contexto da zona e qualidade das ações anteriores associados à eficácia de ataque.

## Salvamento implementado nesta atualização

Cada ação continua gravada em localStorage antes de atualizar a tela. Foram adicionados checkpoint redundante, espelho IndexedDB com cópia anterior, recuperação ao abrir e pedido de armazenamento persistente ao navegador. Funciona sem transmissão. Um erro de leitura não deve substituir os dados originais por uma partida vazia; um erro de escrita bloqueia a confirmação da ação.

Limites: backups continuam no mesmo dispositivo e domínio. Limpar todos os dados do site, usar modo anônimo ou mudar de domínio pode tornar os dados indisponíveis. Exportar JSON continua sendo a cópia transportável. A causa exata da perda relatada não foi comprovada, pois não há logs do tablet nem o arquivo original.
