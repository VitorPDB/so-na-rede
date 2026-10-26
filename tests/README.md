# Conferência de UI

Com `npm run dev`, abra `/tests/scouting.html`. Usa componentes e motor reais, mas um player simulado em memória, sem alterar a partida local do app.

1. Avance 5 s. Abra Análise e volte. O relógio deve manter o novo instante.
2. Abra scouting. Escolha Ataque; anote o horário capturado.
3. Avance mais 5 s no player, escolha Bom e registre para Vidro. Feche: `Último horário` deve corresponder à captura anterior ao avanço.
4. Reabra e desfaça. Feche: a contagem de eventos volta a zero.
5. Teste Escape e retorno de foco, além de navegação por Tab sem sair do modal.
6. Confira em 390×800 e 800×390: player permanece visível enquanto os detalhes rolam, alvos ≥44 px.
7. Crie um card, alterne feed/story e baixe. PNG deve ter 1080×1350/1080×1920.

Teste real complementar: vídeo do YouTube com incorporação permitida, foto de jogador no perfil, e SQL de social/reels aplicado em ambiente de teste. Confirmar seek/restauração pausada e enquadramento da foto no PNG. O fake não comprova comportamento da rede/iframe ou compartilhamento nativo.
