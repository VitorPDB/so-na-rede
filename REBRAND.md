# Só na Rede — rebrand de 10/10/2026

O arquivo `so-na-rede-projeto-antes-rebrand-2026-10-10.zip` foi criado antes das alterações. Contém código, assets, documentação e package-lock.json. Não inclui node_modules, caches, .git, arquivos de ambiente secretos ou outros ZIPs. Extraia em outra pasta e execute `npm install` e `npm run dev` para testar a versão anterior. Os dados da partida estão no navegador: exporte o JSON no app para transferi-los a outro dispositivo.

## Organização

- **Partida:** Ao vivo, Preparação (adversário → formação/saque → revisão) e Pós-jogo.
- **Análise:** Visão do jogo e Estatísticas. Atalhos para momento, rotações e execução. Mini quadras usam a última formação efetivamente observada; sem rally, mostram ausência de dados.
- **Time:** Elenco em cartões com fotos, notas e tamanho da amostra; edição explícita; perfis; biblioteca de formações.
- **Ajustes:** Aparência, notas, publicação, posicionamento de defesa e dados/continuidade. Atalhos internos para as configurações frequentes.

## Visual

Preto profundo, superfícies neutras, roxo discreto para seleção e dourado para destaques. Os dois temas existentes são preservados. Tokens e adaptações responsivas em `src/rebrand.css`; navegação e preparação em `src/Workspace.tsx`.

No tablet em paisagem, o cabeçalho ao vivo reúne título, seções e exportação. Desfazer fica na lateral em telas largas para não cobrir os resultados. Em retrato, o espaço de marcação usa uma coluna. Botões continuam com alvos de toque de pelo menos 56 px.

## Dados e validação

O rebrand não migra o modelo de dados nem altera o motor de notas, rotação, auditoria ou persistência. A preparação utiliza as mesmas regras de formação; em rally aberto a confirmação de escalação permanece bloqueada. A navegação não cria eventos.

Verificar: `npm test`, `npm run build`; navegação das quatro áreas; preparação e revisão de formação; perfil e edição do elenco; relatório; pós-jogo completo/totais; layout em 1280×800 e 800×1280; persistência ao recarregar.
