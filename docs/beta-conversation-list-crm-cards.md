# Cards de CRM na lista de conversas

Branch: `feature/beta-conversation-list-crm-cards`  
Base: `feature/beta-conversation-filters-popover`

## Estrutura anterior

Itens compactos com avatar de iniciais, nome, tempo relativo (“há X”), preview e badge de não lidas ao lado do horário. Na operação, canal + etapa em texto corrido e “· Aguardando” âmbar.

## Nova hierarquia

1. Nome do contato  
2. `Lead #NNNN` + sigla da responsável  
3. Prévia + contador de não lidas  
4. Canal + etapa  

## Código do lead

- Entidade: **Deal** (`leadSequence`)
- Contador: `Organization.nextLeadSequence`
- Geração: `UPDATE … RETURNING` atômico (`allocateLeadSequence`)
- Escopo: único por `organizationId`
- Backfill: `createdAt ASC, id ASC`
- Formato: `Lead #` + `padStart(4, "0")` (sem teto em 4 dígitos)
- Não muda com responsável, etapa, nome ou canal

## Avatar / nome / sigla

- Foto: usa `contact.avatarUrl` se existir (campo ainda não no Contact — documentado)
- Fallback: iniciais ou `?`
- Nome: CRM → telefone formatado → “Contato sem nome”
- Sigla: derivadas do owner do deal (fallback assignee); ausente → “Sem resp.”

## Timestamp

`formatConversationTimestamp` com timezone da org / `America/Sao_Paulo`:

- hoje → `HH:mm`
- ontem → `Ontem`
- 2–6 dias → weekday pt-BR
- ≥7 → `dd/MM/yyyy`

## Estados

| Estado | Visual |
|--------|--------|
| Normal | fundo branco |
| Não lida | peso semibold + badge roxo na linha da preview |
| Aguardando minha resposta | fundo verde muito claro + faixa 3px |
| Selecionada | fundo roxo (`bg-accent`); faixa verde preservada |
| Encerrada | contraste levemente reduzido |

## Canal e etapa

Duas tags inferiores; temperatura removida da lista. Etapa = `currentDeal.stageName` (mesmo stageId do Kanban). Sem etapa → “Sem etapa”.

## API

Lista inclui `leadSequence`, `owner`, `awaitingReply` / `lastMessageDirection`, telefone do contato — sem N+1 por item (include + batch de directions/previews).

## Integrações

- Filtros/popover preservados  
- Ordenação da tarefa anterior preservada  
- Novo lead recebe sequência no `DealsService.create`  
- Código também no resumo do painel direito (mínimo)

## Limitações

- Sem upload/foto WhatsApp nesta tarefa  
- Sem redesign do Kanban, Header, filtros, thread ou composer  
- Siglas podem colidir entre vendedoras (tooltip com nome completo)
