# Cleanup — seta do cabeçalho “Contexto do lead”

## Problema

O painel direito mostrava `← CONTEXTO DO LEAD`, sugerindo navegação de volta inexistente no layout de três colunas.

## Alteração

- Removido `ArrowLeft` + botão `aria-label="Voltar para conversa"` de `LeadContextPanel`
- Removida prop `onBack`
- Título permanece com o mesmo padding/tipografia/altura (`px-4 py-3` + `border-b`)
- Chevrons de accordion (`ChevronDown` / `ChevronRight`) preservados
- Em viewports &lt; `lg`, abrir contexto usa o Dialog já existente (em vez de `mobileView="panel"`), eliminando a necessidade da seta no painel

## Não alterado

Header da conversa (incluindo seta mobile), thread/textura, composer, lista, filtros, Kanban, API.
