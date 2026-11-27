# Pipeline Management UI Polish

A central `/pipelines` agora trata os cards como entradas navegáveis e mantém ações filhas isoladas. Abrir usa a rota oficial do pipeline; Editar reúne identidade e padrões operacionais; Configurar leva à Central de Equipes e Acessos; Etapas e Canais preservam as telas existentes.

## Identidade compartilhada

Create e Edit usam o mesmo componente para descrição, cor, ícone e favorito. A descrição possui contador e máximo de 140 caracteres no frontend e no DTO da API, sem truncar dados legados. O registro contém 17 ícones CRM do Lucide, persiste chaves estáveis e mantém fallback/aliases para valores antigos. Cor usa swatch e HEX validado; favorito usa Star com `aria-pressed`, tooltip e estado preenchido.

O Edit mantém Nome, depois Identidade visual (`Cor | Ícone | Favorito`) e Padrões operacionais (`Equipe padrão | Responsável padrão`). Em pipelines restritos, as novas opções são filtradas pelos grants reais; defaults legados inelegíveis continuam visíveis e não são apagados silenciosamente. Salvar permanece uma única mutation PATCH.

## Ações e cache

- Duplicar exige confirmação e esclarece que dados comerciais/históricos não são copiados.
- Favoritar usa atualização otimista das listas, rollback em erro e invalidação das queries de pipelines.
- Arquivar exige confirmação; Restaurar usa o endpoint existente.
- Excluir mostra bloqueio quando a contagem informa negócios e exige digitação exata do nome quando vazio. O backend continua sendo a autoridade final.
- Todas as mutações invalidam a família de queries `pipelines`, cobrindo listas, favoritos, arquivados, navegação e detalhes.

## Segurança, responsividade e acessibilidade

Mutações administrativas exigem `ADMIN` também no backend e seus controles são ocultados para outros perfis. O card abre por clique ou teclado; links e menu interrompem propagação. O seletor de ícones usa popover em portal, labels acessíveis e botões navegáveis. O formulário possui altura limitada, conteúdo rolável e footer aderente em viewports de 768 px.

## Limitações

A central de acessos aceita `pipelineId` como contexto de navegação, mas sua matriz continua exibindo todas as esteiras para permitir comparação. A suíte E2E histórica possui hang conhecido no runner; a validação desta feature deve priorizar o spec isolado e as verificações críticas. Nenhuma migration, CSS global, configuração Tailwind, fonte, layout ou tema foi alterado.
