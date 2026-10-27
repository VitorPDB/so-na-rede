# Armazenamento local — 26/10/2026

O scout usa IndexedDB como persistência principal. O `localStorage` fica com preferências, vínculos pequenos de sincronização/publicação e caches públicos limitados. Não requer SQL novo. JSON exportado e payload do Supabase continuam completos e compatíveis; referências locais não saem do aparelho.

## Organização e proteção

- `so-na-rede-matches-v2`: documentos de partidas/versionamento por conteúdo, imagens compartilhadas por hash e ponteiro de versão atual/anterior. Referências de históricos completos são carregadas somente ao selecionar, exportar ou sincronizar. Os resumos necessários para a carreira permanecem disponíveis.
- Migração verifica o conteúdo integral após a transação antes de remover os dois registros antigos. Um checkpoint antigo diferente e válido é preservado como versão anterior. Falha de migração preserva a origem. Se uma aba antiga voltar a gravar um JSON divergente, o app bloqueia a troca silenciosa e oferece exportação/importação para escolher a versão.
- Interface otimista com fila ordenada de transações: mostra salvamento pendente/erro, bloqueia fechamento quando há pendência e só publica/sincroniza depois de confirmar gravação. Comparação do token na mesma transação impede sobrescrita por outra aba. Alterações pendentes permanecem exportáveis mesmo após falha de disco.
- Coleta de versões sem referência no início e a cada 20 gravações; conserva a árvore completa atual/anterior e históricos/fotos referenciados. Não remove eventos de auditoria/desfazer.
- Cópias explícitas de transferência passam a ter ID por conteúdo: repetir a mesma cópia não cria outra. Cópias independentes antigas e recuperação legada permanecem preservadas; não há exclusão automática de versões únicas possivelmente não sincronizadas.
- Cache público: até três chaves, no máximo 128 Ki caracteres cada; conteúdo acima do limite não é armazenado offline. Cache é descartável, partidas não são. Relatórios `projection` e `report` derivados em JSONs antigos são descartados na importação e recalculados dos eventos.

## Verificação e medidas

`scripts/verify-local-storage.mjs` roda contra Vite em navegador isolado, com Playwright e navegador indicados por `PLAYWRIGHT_MODULE` e `BROWSER_EXECUTABLE`; `BASE_URL` é opcional (padrão localhost:4176). Não acessa o Supabase real nem o perfil pessoal do navegador.

Fixture sintética: duas partidas finalizadas, 51 comandos por partida, dez fotos de 50 mil caracteres reutilizadas entre jogos. Não são medidas das partidas reais do usuário.

| Medida | Resultado |
| --- | ---: |
| JSON original, uma cópia UTF-8 | 1.057.083 bytes |
| Original + checkpoint, UTF-8 | 2.114.166 bytes |
| Conteúdo normalizado após 25 gravações e coleta, UTF-8 | 605.045 bytes |
| Redução do conteúdo serializado, incluindo checkpoint | 71,4% |
| JSON carregado inicialmente, sem fontes históricas | 544.757 bytes (48,5% menor) |
| Fotos persistidas | 10, compartilhadas entre fontes e checkpoints |
| Documentos após coleta | 3: partida histórica + atual/anterior |
| Migração com releitura/verificação | cerca de 83–100 ms no desktop de teste |

Tamanhos são conteúdo serializado, não uso físico em disco. O uso de heap não foi medido; JSON menor não equivale à mesma redução de RAM. Não houve benchmark em celular físico de baixa capacidade. IndexedDB tem quota variável e pode falhar; a interface trata essa falha sem afirmar que dados pendentes foram salvos.

Cobertura: migração e rollback, backup anterior distinto, JSON íntegro, carregamento de histórico, deduplicação, quota do localStorage cheia, gravações rápidas, reload, coleta, conflito entre abas, recuperação de divergência de versão antiga por importação e transação de gravação interrompida. Conferido também o app real a 390 px: escolher craque, recarregar e manter escolha sem erros de execução. Suíte de 149 testes e build aprovados. Alterações locais; sem commit/push nesta etapa.
