# Revisão do app Só na Rede — 12/10/2026

Revisão do código das áreas Partida, Análise, Time, Ajustes e página pública, do fluxo de salvamento e publicação e das interfaces compartilhadas. Testes de interface concentram-se no fluxo alterado. Esta revisão não substitui uma sessão de observação com o auxiliar em quadra nem testa a conexão real com o Supabase de produção.

| Área | Diagnóstico | Mudança recomendada | Prioridade |
|---|---|---|---|
| Registro ao vivo | Bom/Gafe e o seletor de qualidade permitem classificações opostas para a mesma ação. A/B/C tornam recepção e defesa diferentes das outras linhas. | Qualidade condicionada à ação; Bom com A/B, Gafe com C; pontos permanecem separados. | Aplicada |
| Ficha de avaliação | Selects nativos escondem as alternativas e não seguem o padrão visual de cartões anterior. Há repetição de título/ícone e explicação. | Cabeçalhos expansíveis e cartões com ícones, seleção explícita, contraste discreto e 56 px. Qualidade/dificuldade acessíveis sem abrir todo o contexto. | Aplicada |
| Dificuldade e contexto | A qualidade da bola recebida pode ser confundida com a execução do jogador. | Manter passe recebido A/B/C disponível mesmo quando o levantamento é Bom. Usar rótulos explícitos e uma única influência da dificuldade. | Aplicada |
| Correções | Trocar Bom por Gafe pode deixar critérios positivos antigos, sobretudo precisão de bloqueio. | Limpar qualidade/execução dependentes do resultado, preservando dificuldade, contexto e auditoria. | Aplicada |
| Pós-jogo | As alternativas precisam corresponder ao registro ao vivo; filtros de qualidade podem contradizer a coluna de resultado. | Mesma classificação Bom/Gafe, critérios compatíveis por coluna e acesso às colunas antigas quando já têm dados. | Aplicada |
| Mini quadra e formação | Papel tático e zona de rotação são coisas diferentes; mapa de defesa pode colocar dois jogadores na mesma região. | Preservar as duas visualizações e as funções registradas. Futuramente oferecer uma prévia de todas as rotações antes da partida. | Próxima etapa |
| Notas e estatísticas | Médias evitam penalizar automaticamente pouca participação, mas o destaque com amostra pequena pode parecer definitivo. Contextos usam rallies observados, não tempo real em quadra. | Manter amostra junto da nota e deixar mais evidente que o destaque é provisório. Não apresentar o modelo como medida oficial de habilidade. | Próxima etapa |
| Perfil e histórico | Médias entre partidas de versões diferentes não são perfeitamente comparáveis; a fórmula antiga é preservada. | Mostrar versão da avaliação no histórico/perfil e permitir comparar apenas jogos do mesmo modelo. | Próxima etapa |
| Análise visual | Existem visão da partida, estatísticas e histórico; são complementares, mas a diferença pode não ser evidente para novos usuários. | Usar subtítulos curtos: andamento, números e partidas anteriores. Oferecer navegação contextual entre rotação fraca e seus rallies. | Próxima etapa |
| Dados e offline | Há salvamento antes de confirmar, cópia local redundante e espelho IndexedDB. Todas as cópias continuam no dispositivo/origem. | Exibir hora do último salvamento e oferecer exportação ao encerrar o jogo. Não confundir salvamento local com publicação remota. | Próxima etapa |
| Publicação e fãs | A interface pública consome agregados e distingue atualizações antigas; vídeos carregam sob demanda. | Manter placar acima do vídeo e mostrar claramente “ao vivo”, “sem atualização recente” ou “encerrado”. Separar o estado de conexão do estado da partida. | Próxima etapa |
| Temas e consistência | A ficha introduzida tinha cores fixas próprias, enquanto o restante já possui tokens de tema. | Usar os tokens existentes nos cartões para respeitar os temas escuro, time e claro. | Aplicada |
| Organização do código | Regras de qualidade eram inferidas em vários componentes. | Centralizar intenção da ação, qualidades compatíveis e valores iniciais; compartilhar o componente de cartões. | Aplicada |

## Decisões desta atualização

1. Bom permite apenas qualidades positivas da execução. Gafe permite apenas qualidades ruins que continuam o rally. Erro direto permanece separado e pertence ao ponto perdido.
2. Em recepção/defesa, Bom usa B como padrão editável para A; Gafe usa C. Registrar o caso comum continua exigindo ação + jogador; escolher A acrescenta um toque opcional.
3. A qualidade do passe/levantamento **recebido** não é limitada pela ação: executar bem uma bola ruim continua possível e valorizado pelo contexto.
4. No bloqueio coletivo, a precisão de outro participante permanece independente da ação principal: alguém pode acertar enquanto outro erra.
5. A fórmula v4 e as notas históricas permanecem. Esta mudança melhora o registro, sem recalcular silenciosamente jogos existentes.
6. Totais não recuperam sequência de rallies, tempo em quadra ou rotação. O modo completo continua necessário para essas análises.
