**Vercel + Supabase:** siga [VERCEL.md](VERCEL.md). `vercel.json` configura Vite, build, pasta dist e cache do PWA. O pacote para a Vercel contém código-fonte, SQL e instruções; a transmissão é ativada ao criar/configurar seu Supabase.

# Só na Rede

**Entrega otimizada e público ao vivo:** CSS consolidado, alvos de toque de 56 px, fonte portuguesa offline e carregamento separado de páginas/integração. A página pública acompanha o visual do app, oferece estatísticas por set e guarda a última publicação para consulta offline. Teste `/?view=public&demo=1` com dados fictícios. Para publicar o ZIP e ativar o Supabase sem recompilar, leia [CLOUDFLARE.md](CLOUDFLARE.md).

**Notas contextuais:** dificuldade, situações por fundamento e responsabilidade individual, com bônus limitados e pesos por função. Jogadas ensaiadas e bloqueios duplos/triplos avaliam cada participante sem multiplicar pontos. Disponíveis ao vivo e no pós-jogo; Análise/Estatísticas mostram execução por dificuldade. Registros antigos mantêm o cálculo original. Veja [RATING.md](RATING.md).

Novidades: **Pós-jogo** oferece ficha completa em tabela (rally a rally, com todos os comandos da marcação ao vivo) e ficha rápida de totais por set. As duas salvam rascunhos offline. Totais aceitam colagem de blocos de planilha, função por jogador/set, mais de uma função no mesmo set, qualidades simples ou avançadas, relatório automático e exportação JSON/CSV; salvar adiciona ao histórico individual sem alterar o jogo ao vivo. Edições de fichas rápidas preservam versões anteriores no JSON. A ficha completa reconstrói placar, rotação, toques, zonas, notas, tempos, substituições e líbero; JSON permite importar/exportar tudo de uma vez. Salvar uma ficha completa abre Análise e passa a ser a partida atual, com confirmação. Reaplicar a mesma ficha preserva a auditoria anterior em `postGameVersions`. Fichas de totais não inventam sequência de rallies/rotação. Novas publicações da ficha completa devem ser iniciadas em Configurações.

Em **Configurações → Dados e continuidade**, “Reiniciar apenas o set” volta ao início do set atual: 0–0, formação, primeiro saque, trocas/tempos e estatísticas do set são restaurados/zerados. Notas individuais e coletivas são recalculadas somente com os sets mantidos. Sets anteriores, cadastro e preferências ficam preservados; o reinício é auditado e pode ser desfeito. O relatório e a publicação ao vivo usam automaticamente o estado recalculado.

Scout offline de vôlei indoor, com o elenco real de 10 jogadores e posições ordenadas por frequência.

Leia [MVP.md](MVP.md) para os sete entregáveis, regras, fórmula de rating e critérios de aceite. Para ativar estatísticas públicas ao vivo via Cloudflare Pages + Supabase, siga [ONLINE.md](ONLINE.md).

```sh
npm install
npm run dev
npm test
npm run build
npm run preview -- --port 4173
```

A prévia de produção abre em http://localhost:4173. Para instalar no tablet, hospede o conteúdo de `dist/` em HTTPS e use o menu “Instalar app” do Chrome. O registro local funciona sem conta externa. A publicação opcional ao vivo exige configurar Supabase e hospedar o site; ainda não há serviço público ativado.

Antes de desconectar, aguarde o indicador **Offline pronto**. O registro usa resultado → jogador, mantendo dificuldade e situações opcionais. O modo toque a toque foi removido; registros antigos continuam preservados nos backups.

Modo simples: Saque/Recepção conforme o lado do saque, Levantamento, Ataque, Bloqueio e Defesa. Cada fundamento tem Bom, Gafe, Ponto nosso e Ponto deles; depois do resultado, escolha o jogador no modal com mini quadra e fotos. Bom/Gafe continuam o rally; pontos o encerram automaticamente. Ponto identificado exige dois toques. Formação inicial em mini quadra, com permuta livre entre zonas. Posições do perfil não restringem as trocas. Desfazer é fixo; correções são auditadas.

Dados salvos no localStorage deste navegador, a cada ação. Exporte JSON para backup completo; CSV oferece os eventos e o resumo. Limpar dados do navegador remove o jogo local. Use uma aba e um dispositivo por partida.

Fontes: React, TypeScript, Tailwind, Vite e ícones Lucide. PWA com manifest e service worker cacheado por versão. Sem vídeo, relógio de jogo, PDF ou sincronização na fase inicial.

Formações 5–1: salve a base P1 e escolha P1–P6 na mini quadra. A indicação P corresponde à zona do levantador. As notas individuais usam a função tática em cada evento, com perfis configuráveis; a nota coletiva mantém pesos próprios. Configurações também permite escolher Preto escuro ou roxo/dourado Só na Rede, ambos com o escudo original. Formações e perfis são incluídos no JSON e mantidos ao iniciar outra partida.

Perfis: abra Elenco → Perfil. Fotos têm ajuste de enquadramento e zoom e entram no backup JSON. Partidas concluídas alimentam notas médias, recordes, melhor jogo e ponto forte; ao iniciar outra partida, o resumo anterior fica preservado. Exporte JSON para manter também a auditoria completa de cada jogo. Registro contextual alterna Saque/Recepção e mantém Defesa separada. Uniformes nas mini quadras reproduzem o roxo/preto do time e o branco/vermelho do líbero.

Registro de ação primeiro: toque no resultado e depois no jogador; nenhuma ação é salva antes de atribuir. O toggle Líbero automático na quadra entra quando o central da zona 1 perde o saque e devolve o central antes da rede/saque. Toggle e pontos são auditados; desfazer também restaura trocas automáticas. Fotos do perfil aparecem nas estatísticas.

Seleção de jogador: escolha Posicionamento em quadra (rotação) ou Posicionamento de defesa. Em Configurações → Posicionamento de defesa, ajuste a zona 1, 5 ou 6 de cada função do fundo; jogadores da rede continuam nas zonas 2–4. Duas pessoas na mesma região aparecem lado a lado. O mapa não altera rotação nem elegibilidade. Sem foto, aparece o número.

Últimas ações → Trocar jogador abre a mesma mini quadra com a formação no momento da ação. Resultado e contexto são preservados, a correção fica auditada e pode ser desfeita. O resumo do último rally mostra sequência, vencedor e placar sem abrir painel. Perfil → Função no histórico filtra notas e fundamentos pela função registrada, incluindo a partida atual. Históricos antigos sem resumo por função continuam em Todas as funções.

Análise: nova aba com destaque, atenção da comissão (menor nota entre amostras comparáveis), sequência atual, falhas recentes, linha do placar por set e histórico de pontos selecionável. Toque P1–P6 para ver a última formação observada: P é a zona do levantador antes do rally terminar. Aproveitamento recebendo e pontos ganhos com nosso saque usam todos os rallies, inclusive sem fundamento. Filtro por set ou jogo completo.

Pedidos de tempo: registre nosso/deles em Ao vivo ou Análise. Limite de dois por time por set, entre rallies. Tempos e substituições aparecem na linha do placar. O resumo compara pontos ganhos nas janelas de até 5 rallies antes/depois do tempo, dentro do mesmo set, mostrando janelas incompletas. Tempos são incluídos no JSON e podem ser desfeitos; não contam como ações de jogador nem alteram nota ou rotação.

Logos: o escudo do Só na Rede usa PNG transparente no app, sem cartão ao redor. Em Configurações → Partida, preencha o nome do adversário e adicione PNG/JPG/WebP. Logos ficam associados ao nome e reutilizáveis no seletor Adversários cadastrados. PNG transparente preserva o recorte; fundos de JPG/imagens opacas são mantidos. A biblioteca acompanha novas partidas e backups JSON. Trocar o nome não aplica o logo de outro time.

## Histórico e dificuldade das notas

A comissão consulta partidas anteriores em Análise → Histórico. Ao iniciar outra partida, ficam preservados os números individuais e a análise por set dos novos registros. Backups antigos continuam disponíveis como resumos. A página pública tem Ao vivo e Partidas anteriores, com links próprios por jogo; execute o SQL atualizado para ativar o arquivo público.

As notas combinam qualidade média por fundamento, pesos da função exercida no momento e suavização de amostras pequenas. Em uma ação Bom/Gafe sem situações extras, a qualidade interna de 0 a 100% é:

| Bola | Bom | Gafe |
|---|---:|---:|
| Fácil | 77,5% | 0% |
| Normal | 87,5% | 5% |
| Difícil | 97,5% | 25% |
| Emergência | 100% | 36% |

Isso se aplica a levantamento, recepção, ataque, bloqueio, defesa e saque. Gafe difícil prejudica menos a nota que gafe fácil; o número de gafes continua sendo contado. Esses valores representam a ação, não um desconto fixo na nota final. Situações específicas e responsabilidade em ações coletivas podem ajustar essa qualidade. Os eventos atuais são penalizados pela qualidade, sem um segundo desconto duplicado; eventos antigos sem avaliação detalhada mantêm o cálculo original.
