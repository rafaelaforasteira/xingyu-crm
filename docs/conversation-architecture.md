# Conversation & navigation architecture

## Conversation scopes

```
ConversationWorkspace
  scope: global | pipeline(pipelineId)
  → ConversationList (light GET /conversations)
  → ConversationThread (GET /conversations/:id/messages)
  → LeadContextPanel (GET /conversations/:id/context + lazy sections)
```

Routes:
- `/inbox`, `/inbox/[conversationId]` — all org conversations
- `/pipelines/[pipelineId]/conversations[/[conversationId]]` — deals’ conversations in that pipeline

## Endpoints

| Endpoint | Role |
|----------|------|
| GET /conversations | Light inbox rows + filters |
| GET /conversations/:id | Detail **without** message history |
| GET /conversations/:id/messages | Cursor/page message thread |
| GET /conversations/:id/context | Lead panel summary + counts |
| PATCH /conversations/:id/read | Clear unread |
| GET /pipelines/navigation | Sidebar submenu |

## Cache rules

- Optimistic append on send; patch list preview
- Invalidate only affected conversation messages/list filter/board when deals move
- Pipeline navigation query staleTime ~3 minutes
