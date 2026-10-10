# Só na Rede — especificação do MVP

## 1. Assunções

- Ferramenta interna da comissão, sem login, servidor ou sincronização entre dispositivos.
- Os **10 jogadores reais** enviados substituem a solicitação inicial de 12 mocks. Não há jogadores nem estatísticas inventados.
- Posições do perfil são ordenadas por frequência; zona de rotação e posição tática são conceitos distintos.
- Liam nº 01 é líbero absoluto. Sistema 5–1 confirmado. P1 inicial: Vitor Z1, Akira Z2, Leo Godoy Z3, Vidro Z4, Foden Z5, Leo sá Z6. Confirmação editável antes da partida e de cada set. Jogos existentes mantêm seus titulares.
- Padrão: melhor de cinco, sets de 25, decisivo de 15 e diferença mínima de dois. Melhor de três também disponível.
- Resultado decisivo encerra o rally automaticamente, conforme autorizado. Ponto sem atribuição não cria estatística individual.
- Recepção: **E=erro/0, −=negativa/1, !=neutra/2, +=boa/3, #=perfeita/3**. Este é um mapeamento local explícito; + e # distinguem classes, mas têm a mesma qualidade numérica inicial.
- “Ataque certo” significa bola válida que continua em jogo; “errado” é erro terminal. “Saque fácil” continua em jogo.
- No modo simples há cinco fundamentos (Saque, Recepção, Levantamento, Ataque e Bloqueio), com Bom, Gafe e Ponto. Bom/Gafe continuam o rally; Ponto pede Nosso/Deles e o encerra.
- Auditoria fica no navegador; exportação JSON preserva os originais, as correções e as ações desfeitas. PDF e sincronização com vídeo ficam para fase 2.

## 2. PRD curto

**Problema:** anotar uma partida amadora na quadra deve ser rápido, recuperável e útil para a decisão técnica.

**Usuário:** auxiliar técnico com tablet Android e uma mão disponível. Prioridade: paisagem, alvos de pelo menos 56×56 CSS px, seleção explícita e feedback de resultado.

**Produto:** React + TypeScript + Tailwind. Preto profundo (#08090a), cartões escuros, texto claro e cores discretas: verde acinzentado para Bom/nosso, ocre para Gafe e vermelho dessaturado para deles. Sem neon. Quadra é um mapa da ordem de rotação, não um rastreamento da posição real durante a jogada.

**Escopo:** placar, sets, saque, rotação, elenco, formação por set, substituições ordinárias, trocas simplificadas do líbero, sete fundamentos, modo simples e toque a toque, undo, correção auditada, relatório ao vivo, filtros por set e exportações JSON/CSV.

**Operação rápida:** no modo simples, cada fundamento exibe Bom, Gafe e Ponto na própria linha. Bom/Gafe: um toque com atleta selecionado, dois incluindo a seleção. Ponto: tocar Ponto → Nosso/Deles (dois toques com atleta selecionado, três incluindo a seleção). Esse fluxo explícito substitui os atalhos decisivos da primeira versão. Ponto sem fundamento segue em um toque.

**Regras:** rotação somente quando nosso time pontua recebendo; avanço 2→1→6→5→4→3→2. Set fecha automaticamente, pede confirmação de formação seguinte, jogo fecha com três sets vencidos (ou dois em melhor de três). Líbero apenas no fundo, sem saque, com retorno automático do substituído ao ir à rede ou ao saque. Máximo de seis substituições ordinárias e retorno pelo mesmo par, uma vez por titular. Exceções médicas, expulsões e redesignação de líbero estão fora do MVP. Trocas bloqueadas quando há ações de rally em aberto.

**Offline:** salvamento síncrono no localStorage antes de aceitar a alteração na tela. Falha de escrita bloqueia a alteração e avisa a comissão. Service worker pré-carrega HTML e assets locais da versão de produção; fontes e ícones não dependem de CDN. Cache recebe versão a cada build. Primeira abertura e instalação exigem acesso à versão servida por HTTPS (localhost também aceita service workers).

**Dados:** um jogo ativo por navegador. Nova partida e importação pedem confirmação para substituir o jogo. Exportar antes de trocar de dispositivo ou apagar dados do navegador. Uso simultâneo em múltiplas abas não é o fluxo recomendado.

**Métricas de sucesso:** um toque em Bom/Gafe e dois em Ponto com o atleta selecionado; undo em um toque, ausência de perda ao recarregar, rotação correta e relatório com interpretação transparente da amostra.

**Fase 2:** PDF diagramado, IndexedDB com arquivo de partidas, métricas oficiais de eficiência, comparações longitudinais e timestamp de vídeo.

Referência de jogo: [FIVB, regras oficiais 2025–2028](https://www.fivb.com/wp-content/uploads/2025/01/FIVB-Volleyball_Rules2025_2028-EN-v05.pdf), itens 6, 7.6, 15.6 e 19. A ferramenta faz scout; não substitui a súmula nem a arbitragem.

## 3. Fluxo de telas

1. **Marcação ao vivo:** placar → formação inicial em mini quadra → tocar zona → escolher qualquer jogador regular → escolher primeiro saque → confirmar. Se o escolhido já estiver em outra zona, os dois são permutados; não há filtro por posição tática.
2. **Modo simples (default):** selecionar jogador → Bom/Gafe na linha do fundamento (sem ponto), ou Ponto → Nosso/Deles (encerra rally). Cada anotação atualiza as estatísticas. A recarga mantém o modo simples mesmo com ações Bom/Gafe em aberto.
3. **Toque a toque:** ativar toggle → selecionar atleta → fundamento → qualidade → continuar. Toque e zona podem ser ajustados. “Nova posse” volta ao toque 1; bloqueio e saque não avançam o contador dos três toques. Resultado terminal fecha o rally; ponto sem fundamento também pode encerrá-lo.
4. **Trocas:** selecionar atleta na quadra → botão de troca ou atleta do banco → selecionar entrada → confirmar. Saída do líbero restaura exatamente o atleta que ele substituiu.
5. **Undo:** botão fixo sempre visível na marcação → restaura a última ação efetiva, incluindo uma correção.
6. **Correção:** Histórico e correções → ação → Corrigir → ajustar atleta/resultado, informar motivo → salvar. Não há modal encadeado. Ações posteriores são revalidadas; uma correção que invalida um saque, formação ou substituição exige desfazer as dependências antes.
7. **Intervalo:** set fechado → preparar próximo set → ajustar seis titulares e primeiro saque → confirmar. No decisivo, confirmar o saque conforme sorteio.
8. **Estatísticas:** resumo coletivo, nota, melhor/pior individual e razões já aparecem sem expansão de linhas. Filtros “Jogo completo” e “Set N”. Ao fim do jogo essa tela abre automaticamente.
9. **Elenco:** nomes, números e lista ordenada de posições. Clicar em uma posição secundária move-a um lugar para a esquerda; campo separado por vírgulas permite edição. Liam permanece líbero.
10. **Configurações:** nome do adversário, formato antes do jogo, formação, pesos, vibração opcional, exportar/restaurar backup e iniciar nova partida.

## 4. Modelo de dados TypeScript

Modelo completo: [src/model.ts](src/model.ts). Motor: [src/engine.ts](src/engine.ts).

```ts
type Side = "ours" | "theirs";
type Zone = 1 | 2 | 3 | 4 | 5 | 6;
interface Player {
  id: string;
  name: string;
  number: number;
  positions: string[]; // Mais frequente → menos frequente
  libero: boolean;
}
interface SkillEvent {
  playerId?: string; // Ausente em erro adversário
  skill:
    "reception" | "serve" | "attack" | "block" | "defense" | "set" | "opponent";
  result: string;
  zone?: Zone;
  touch?: 1 | 2 | 3;
  videoTimestampMs?: number;
  winner?: Side;
}
interface Context {
  set: number;
  rally: number;
  rotation: number;
  serving: Side;
}
interface AuditEntry {
  id: string;
  createdAt: string; // ISO UTC, exibido no fuso do dispositivo
  kind: "action" | "undo" | "correction";
  command?: Command; // Evento, ponto, sub, líbero, formação ou novo set
  context?: Context; // Contexto original da anotação
  target?: string; // ID de ação/correção referenciada
  reason?: string;
}
```

`Match` guarda schemaVersion, ID, elenco, formação inicial, regras, pesos e trilha. `Projection` é calculada por replay: placar, sets, saque, formação atual, rotação, eventos efetivos e contadores de troca. `RecordedEvent` materializa contexto recalculado e placar anterior; contexto original permanece na auditoria. Undo não remove registros. Correction mantém o original e aplica a última correção ativa.

## 5. Fórmula inicial de rating

Pesos coletivos positivos: recepção 25, ataque 25, saque 15, bloqueio 15, defesa/levantamento juntos 10. Penalidade de erros 10, **separada** dos 90 pontos positivos. Todos configuráveis entre 0 e 100.

Qualidade de resultado `q` entre 0 e 1:

| Fundamento   | Qualidades iniciais                           |
| ------------ | --------------------------------------------- |
| Recepção     | 0, 1/3, 2/3, 1, 1 para E, −, !, +, #          |
| Ataque       | ponto 1; certo 0,5; errado 0                  |
| Saque        | ace 1; bom 0,8; neutro 0,5; fácil 0,2; erro 0 |
| Bloqueio     | ponto 1; toque efetivo 0,7; erro 0            |
| Defesa       | boa 1; neutra 0,5; erro 0                     |
| Levantamento | bom 1; ruim 0,25; erro 0                      |

Para cada grupo **observado**, suavizar com três ações neutras:

```text
Q_g = (Σ qualidade das ações do grupo + 3 × 0,5) / (n_g + 3)
B = Σ (peso_g × Q_g) / Σ pesos dos grupos observados
E = quantidade de erros / total de ações do atleta
nota = clamp(10 × B − (peso_erros / 10) × E, 0, 10)
```

Grupos não observados não recebem zero nem nota fictícia; os pesos restantes são normalizados. Defesa e levantamento compartilham um grupo apenas na nota coletiva; nas notas individuais são separados. O erro já reduz a qualidade de seu fundamento e recebe a penalidade adicional explicitamente solicitada.

**Exemplo:** três ataques ponto, sem outros fundamentos → `(3 + 1,5)/(3+3)=0,75` → nota 7,5. Cinquenta ataques ponto aproximam a nota de 10. Sem ações, nota “—”. Com todos os pesos observados zerados, nota “—”.

**Melhor/pior:** médias brutas de qualidade por fundamento registrado, com contagem e aviso “amostra baixa” abaixo de três ações. Com apenas um fundamento não se inventa um pior diferente. Empates são desempatados por volume e depois ordem estável; não significam diferença técnica real. A porcentagem representa qualidade normalizada, não eficiência oficial de ataque ou recepção.

**Destaque:** maior nota entre atletas com três ou mais ações; quando ninguém atinge esse volume, maior nota disponível com rótulo “provisório”. O coletivo aplica a mesma fórmula ao conjunto de eventos do time, ponderando o volume dentro de cada fundamento. Erro adversário dá ponto no placar, mas não aumenta nota de nenhum atleta.

No modo simples, Bom tem qualidade 1; Gafe tem qualidade 0 e conta como falha, mas não pontua. Ponto nosso tem qualidade 1; Ponto deles tem qualidade 0 e conta como falha atribuída ao fundamento. IDs distintos preservam a distinção em backups e correções. Limitação metodológica: a escala simplificada não distingue os níveis intermediários do modo toque a toque; comparar notas entre modos exige cuidado. Ajustar os perfis por função após alguns jogos.

### Funções e perfis individuais

A P1 define levantador Z1, ponteiro Z2, central Z3, oposto Z4, ponteiro Z5, central Z6. Cada predefinição salva seis IDs nessa ordem. P2–P6 deslocam todos os jogadores e funções, indicando a zona do levantador. Side-out avança P1 → P6 → P5 → P4 → P3 → P2 → P1. A contagem interna de rotações é separada da indicação P.

Substituto assume a função tática do titular, independentemente das posições de cadastro. Líbero usa seu próprio perfil. Cada evento projetado registra a função vigente; corrigir ou desfazer recalcula esse contexto. Jogos antigos inferem funções a partir do levantador com posição principal no cadastro; se não existir, usam posições principais como referência. Confirmar a próxima formação remove essa ambiguidade sem mudar o placar antigo.

| Função     | Recepção | Ataque | Saque | Bloqueio | Defesa | Levantamento | Penalidade |
| ---------- | -------: | -----: | ----: | -------: | -----: | -----------: | ---------: |
| Levantador |        5 |      5 |    15 |       10 |     15 |           40 |         10 |
| Ponteiro   |       25 |     30 |    10 |       10 |     10 |            5 |         10 |
| Central    |        5 |     30 |    15 |       30 |      5 |            5 |         10 |
| Oposto     |        5 |     40 |    15 |       15 |     10 |            5 |         10 |
| Líbero     |       45 |      0 |     0 |        0 |     40 |            5 |         10 |

Por função histórica `r`, calcular `Q` por fundamento com a mesma suavização de três ações neutras. Normalizar somente pesos positivos dos fundamentos observados e calcular `B_r`. Para atletas que exerceram mais de uma função, `nota = clamp(10 × Σ(n_r × B_r)/Σn_r − Σ(penalidade_r/10 × erros_r)/Σn_r, 0, 10)`. Perfis sem qualquer fundamento observado com peso positivo não entram no cálculo. Ausência de recepção não penaliza centrais/opostos; quantidade de levantamentos não rende bônus. Pesos ajustáveis em Configurações → Notas por função. Alterá-los recalcula as notas do jogo.

Formações ficam no backup JSON e são mantidas na próxima partida. A biblioteca pode ser preparada durante o jogo; aplicar titulares continua restrito ao início ou à transição de set. O tema Preto escuro ou Só na Rede (roxo profundo e dourado discreto) fica salvo no dispositivo. A logo original aparece na navegação e no placar e entra no cache offline.

## 6. Protótipo funcional

Implementação: [src/App.tsx](src/App.tsx), [src/styles.css](src/styles.css), [src/storage.ts](src/storage.ts), [public/sw.js](public/sw.js).

```sh
npm install
npm run dev
npm test
npm run build
npm run preview -- --port 4173
```

Prévia local: `http://localhost:4173`. Build estático em `dist/`. Para o Galaxy Tab A9, servir `dist/` em HTTPS e instalar pelo Chrome. O endereço HTTP da rede local permite conferir a tela, mas não ativa a PWA/offline no Android.

Elenco inicial:

| Jogador   | Nº  | Posições, por frequência      |
| --------- | --- | ----------------------------- |
| Vidro     | 11  | Oposto → Central → Levantador |
| Akira     | 02  | Ponteiro → Levantador         |
| Leo Godoy | 07  | Central → Oposto              |
| Leo sá    | 18  | Central → Ponteiro            |
| Vitor     | 04  | Levantador                    |
| Foden     | 10  | Ponteiro                      |
| Andrey    | 22  | Central                       |
| Maath     | 14  | Ponteiro                      |
| Pedro     | 06  | Ponteiro → Oposto             |
| Liam      | 01  | Líbero absoluto               |

Exportações: JSON com auditoria e relatório; CSV dos eventos efetivos; CSV do resumo individual/coletivo. UTF-8 com BOM, separador `;` e proteção de células contra fórmulas de planilha. No JSON, timestamps de vídeo podem ser preenchidos futuramente sem mudar o formato do evento.

## 7. Critérios de aceite em quadra

| Cenário                                                         | Resultado esperado                                                          |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Atleta selecionado → Ataque Ponto → Nosso                       | +1 nosso e ação atribuída, em dois toques (três incluindo seleção)          |
| Sacador da zona 1 → Saque Ponto → Nosso                         | +1 nosso; mantém rotação                                                    |
| Jogador da rede → Bloqueio Ponto → Nosso                        | +1 nosso; bloqueio atribuído                                                |
| Bom/Gafe nos cinco fundamentos simples                          | Registra qualidade, mantém placar e rally                                   |
| Mini quadra: escolher jogador de outra zona                     | Permuta os titulares sem duplicidade e sem filtro por posição               |
| Toque em Desfazer                                               | Última ação revertida em um toque; botão sempre visível                     |
| Nosso ponto quando adversário sacava                            | Rotação 2→1→6→5→4→3→2 e saque nosso                                         |
| Nosso ponto quando já sacávamos                                 | Formação e rotação não mudam                                                |
| Seis side-outs nossos                                           | Formação volta à ordem original                                             |
| 24–24 → 25–24 → 26–24                                           | Set aberto no primeiro ponto e encerrado no segundo                         |
| Decisivo 14–14 → 15–14 → 16–14                                  | Mesma diferença de dois, meta de 15                                         |
| Terceiro set vencido em melhor de cinco                         | Partida termina e relatório abre automaticamente                            |
| Líbero no fundo; rotação leva à zona 4                          | Retorno automático de quem ele substituiu                                   |
| Líbero na zona 1 recuperando saque                              | Retorno automático antes do saque                                           |
| Troca ordinária e retorno                                       | Preserva zona, valida mesmo par e limita a seis                             |
| Registrar recepção boa no avançado                              | Não soma ponto; guarda toque, zona, rally e rotação                         |
| Corrigir jogador/resultado                                      | Original permanece; relatório recalculado; motivo e referência na auditoria |
| Corrigir ponto que invalida saque posterior                     | Correção bloqueada com instrução de desfazer dependências                   |
| Desfazer correção                                               | Recupera o resultado efetivo anterior                                       |
| Atualização ao vivo                                             | Nota, melhores/piores, razões e destaque refletem a ação                    |
| Abrir relatório                                                 | Todos os jogadores e resumo coletivo visíveis sem expandir linhas           |
| Filtro por set                                                  | Considera somente eventos daquele set                                       |
| Recarregar durante rally                                        | Placar, eventos, formação e auditoria preservados                           |
| Primeiro acesso online em produção, depois modo avião e recarga | Interface abre e permite continuar anotando offline                         |
| Exportar JSON/CSV                                               | Arquivos legíveis, nomes corretos e eventos com contexto                    |
| Restaurar JSON exportado                                        | Mesmo placar, formação, eventos e histórico                                 |
| Paisagem e retrato no A9                                        | Sem overflow horizontal da página; alvos ≥56px; tabelas têm rolagem própria |

Os testes automatizados cobrem o motor; instalação, precisão/velocidade de toque, modo avião e ergonomia devem também ser avaliados no tablet real. Meta de campo: 20 rallies; Bom/Gafe em até dois toques incluindo atleta, Ponto em dois toques com atleta selecionado ou três incluindo a seleção, sem erro não recuperável.

### Validação realizada

- 28 testes automatizados aprovados, incluindo Bom/Gafe sem pontuação, Nosso/Deles, backup dos novos resultados e permuta de titulares de posições diferentes. Cobertura anterior: rotação, placar, set, tie-break, líbero, substituições, correção, undo, rating, serialização, validação de backup e conflito entre abas.
- Build TypeScript/Vite aprovada; dependências auditadas sem vulnerabilidades na instalação.
- Navegador: mini quadra com troca levantador/oposto, Bom/Gafe sem ponto, Ponto Nosso/Deles, recarga e relatório escuro verificados em sessão separada do jogo em andamento. Side-out, undo, modo avançado e auditoria também foram verificados na primeira versão.
- Dimensões simuladas: 1340×800 em paisagem e 800×1340 em retrato; controles medidos com pelo menos 56×56 CSS px e sem overflow horizontal da página.
- Cache: após “Offline pronto”, servidor local desligado, página recarregada e ações/correções salvas com sucesso. Esse teste não substitui a instalação e o modo avião no Android real.

Critérios adicionais: testar P1–P6 com levantador nas seis zonas; confirmar função após side-out e substituição; salvar/recarregar predefinições; ajustar pesos de levantamento sem afetar a nota coletiva; alternar os dois temas e recarregar mantendo a escolha.

Validação das novas formações: 21 testes aprovados e build de produção concluído. Na prévia isolada, P3 foi salvo e recarregado; um side-out levou a P2; relatório exibiu a função Levantador e nota 6,3 para uma ação boa de levantamento. Botões simples mediram no mínimo 56 px de altura e 65 px de largura em 1280×800. Em 800×1280 não houve rolagem horizontal. Após desligar o servidor da prévia, a recarga manteve placar 1–1, P2, os dois escudos e o tema do time. O jogo da aba principal foi preservado.

### Perfis, uniformes e registro contextual

- Mini quadras usam camisetas SVG baseadas no uniforme: roxo, bordas pretas, faixa com nome do time e número claro. Líbero: corpo branco, bordas/vermelho e número vermelho. As cores dos uniformes não mudam com o tema.
- Salvar P1 antes do primeiro rally também aplica a formação e suas funções ao vivo; durante a partida, salvar apenas prepara a biblioteca. A função do jogador em quadra acompanha o lugar tático atribuído e a rotação. Posições do cadastro continuam sendo preferências pessoais. A próxima partida começa com a última formação inicial confirmada, preservando suas funções.
- Registro simples: Saque quando o nosso time saca; Recepção quando eles sacam. Levantamento, Ataque, Bloqueio e Defesa são opções separadas. Defesa é controle do ataque adversário, e não recepção de saque. Bom/Gafe de defesa continuam o rally; Ponto pergunta Nosso/Deles. Modo avançado também usa a alternância Saque/Recepção.
- Elenco → Perfil abre foto ajustável (horizontal, vertical e zoom), partida atual, média por partida, maior/menor nota, melhor jogo, ponto forte, totais e lista de partidas concluídas. Não são inventadas notas sem ações. Ponto forte com menos de três ações é provisório.
- Fotos JPG/PNG/WebP de até 15 MB são comprimidas localmente em JPEG de até 384 px e 160 mil caracteres base64. Foto e enquadramento fazem parte do backup JSON. Falha de armazenamento preserva o perfil anterior.
- Ao iniciar uma nova partida, o jogo anterior gera um resumo por jogador no histórico. Partidas incompletas não entram nas médias e recordes. As notas de jogos arquivados mantêm os pesos aplicados naquele jogo. A partida atual concluída entra imediatamente e é deduplicada pelo ID.
- Resumos históricos preservam notas, fundamentos, quantidades, adversário, data e sets; a auditoria detalhada dos jogos anteriores deve continuar sendo exportada em JSON. Jogos já descartados antes desta versão não podem ser recuperados sem backup.

Validação: 26 testes de motor, notas, defesa, função do Akira, histórico, fotos e backup. Na prévia isolada, Akira foi escalado como levantador com cadastro de ponteiro; a função apareceu corretamente ao vivo. A alternância Saque/Recepção e o uniforme do Liam foram verificados. Uma imagem de teste recebeu zoom 1,1 e deslocamento vertical 100, preservados ao recarregar. Uma partida foi concluída 3–0; o perfil exibiu média/maior/menor 6,3 e ponto forte Defesa; iniciar outra partida preservou esse histórico e a foto.

Verificação final dos perfis em 1280×800 e 800×1280 sem rolagem horizontal. Corrigida a disposição para mostrar controles de foto e resumo lado a lado em paisagem. O cache offline busca a navegação atualizada quando há rede e mantém uma versão anterior dos arquivos para abas ainda abertas, evitando tela vazia durante a troca de build.

Migração de formações antigas: antes do primeiro rally, caso não existam funções táticas persistidas, acrescentar uma configuração P1 auditada com os mesmos seis titulares e o mesmo primeiro saque. A migração é idempotente e não altera jogos que já começaram. Na aba principal, Akira passou a Levantador na zona 1 e o placar permaneceu 0–0. Foto, enquadramento e histórico foram recarregados com o servidor da prévia desligado.

### Ação primeiro e líbero automático

- No registro, escolher fundamento/resultado primeiro (ex.: Ataque → Bom) e depois o jogador na lista de seis atletas ou na mini quadra. Bom/Gafe exigem dois toques. Ponto mantém escolha Nosso/Deles antes da atribuição. O seletor só salva ao escolher jogador; cancelar não cria evento. No modo avançado, zona automática vem do jogador escolhido, com zona manual opcional. Saque restringe o seletor ao sacador e bloqueio efetivo aos jogadores da rede; o motor também valida toques na quadra.
- Toggle Líbero automático inicialmente desligado, auditado e preservado ao iniciar outra partida. Quando ligado, se um central tático da zona 1 estava sacando e perde o rally, o líbero entra no seu lugar. A troca é projetada junto ao ponto: desfazer restaura também os atletas. Funções acompanham a formação; não são inferidas da preferência do cadastro. Líbero volta ao banco ao entrar na rede ou antes de sacar. A troca não consome substituição regular e não é feita após encerrar o set.
- Desligar restaura o atleta substituído quando há líbero em quadra, respeitando um rally completo entre trocas. Alterar o modo durante rally aberto é bloqueado com explicação. Trocas manuais continuam disponíveis.
- Fotos cadastradas aparecem na tabela de estatísticas, nos destaques e no seletor de jogador, com o mesmo enquadramento do perfil. Sem foto, exibir número da camisa.

Verificação: 28 testes aprovados. Na prévia isolada, Ataque/Bom foi atribuído a Vidro na lista, Defesa/Gafe a Vidro na quadra, e cancelamento manteve apenas os dois registros. Na P5 com central da zona 1 sacando, um ponto deles atribuído ao central colocou Liam na zona 1; desfazer retornou Leo Godoy e restaurou o placar. Foto de teste apareceu na tabela de estatísticas.

Validação adicional: botões do seletor mediram 76 px de altura e aproximadamente 173 px de largura em 1280×800; em 800×1280 não houve rolagem horizontal. No modo avançado com zona automática, escolher Vidro registrou defesa boa com zona 2, toque 1 e função Oposto no JSON. Após desligar o servidor, recarregar manteve eventos, modo automático ligado e foto na tabela. A aba principal foi atualizada preservando o placar 3–3, adversário e rotação existentes.


## Atualização: seleção por quadra e defesa

- Resultado primeiro; Ponto nosso/deles direto e depois jogador: dois toques. Bom/Gafe seguem em jogo.
- Modal grande com fotos e escolha persistente entre zona de rotação e região de defesa. Mapa do fundo ajustável por função; rede permanece nas zonas 2–4. Regiões compartilhadas mostram todos os jogadores sem alterar a ordem oficial.
- Correção rápida de atribuição em Últimas ações usa a formação histórica e preserva resultado, contexto, placar e auditoria. Desfazer restaura a atribuição original.
- Último rally encerrado exibe sequência e placar automaticamente.
- Perfil filtra notas e estatísticas pela função efetivamente registrada, na partida atual e nas concluídas. Resumos antigos sem discriminação por função entram somente em Todas as funções.

Validação: 31 testes aprovados, incluindo mapa, resumo/undo/correção e histórico por função. Navegador verificado em 1280×800 e 800×1280; modal sem rolagem horizontal e alvos superiores a 56 px. Imagem de teste aparece no modal. Correção Vidro→Akira manteve 1–0 e desfazer restaurou Vidro. Recarga offline preservou placar, eventos e foto. Cache só promove uma nova página após armazenar os arquivos correspondentes.


## Aba Análise e tempos

- Estatísticas permanece como relatório detalhado; Análise oferece visão visual com filtros por set e partida.
- Destaque/atenção compara jogadores com pelo menos três ações. Quando não há nenhum com essa amostra, a avaliação é provisória. Um único candidato não gera comparação negativa consigo mesmo.
- Evolução do placar separada por set; histórico selecionável revela saque, P e sequência de ações. Tempos e substituições manuais aparecem como marcadores.
- P é a zona real do levantador antes do ponto. Mini quadra mostra a última formação observada no recorte. Aproveitamento recebendo = pontos ganhos recebendo / rallies recebendo; desempenho sacando = pontos ganhos sacando / rallies sacando. Ambos incluem pontos sem fundamento.
- Pedidos de tempo auditados, no máximo dois por lado por set, somente entre rallies. Desfazer restaura a contagem; comparação antes/depois usa até cinco rallies do mesmo set sem atribuir causalidade ao tempo.

Validação do motor: 36 testes aprovados, incluindo side-out atribuído à P anterior, pontos manuais, tempo sem mudar placar/rotação, limite por lado, desfazer, persistência JSON, janelas por set e formações históricas após substituição.


## Logos dos times

Escudo Só na Rede com transparência real fora da silhueta e sem moldura CSS. Cadastro de logos PNG/JPG/WebP dos adversários em Configurações → Partida, com compressão PNG local preservando alpha. Biblioteca por nome do time acompanha novas partidas e backups; mudar para um nome sem cadastro não reutiliza escudo de outro time. Logos podem ser trocados/removidos.

Validação: 37 testes aprovados e build concluído. PNG do time validado RGBA com alpha 0 nos cantos. Upload de teste apareceu no placar, foi reutilizado pelo seletor de adversários e persistiu na recarga offline. Escudos sem fundo/moldura verificados nos dois temas.
