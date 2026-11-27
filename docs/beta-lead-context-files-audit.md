# Auditoria — Arquivos curados do lead

| Campo/conceito           | Existe?     | Local                                         | Usar? | Ação                                       |
| ------------------------ | ----------- | --------------------------------------------- | ----- | ------------------------------------------ |
| Message ID               | Sim         | `Message.id`                                  | Sim   | Origem persistente                         |
| Attachment ID            | Sim         | `MessageAttachment.id`                        | Sim   | Identidade do arquivo                      |
| Media ID separado        | Não         | —                                             | Não   | Attachment é o recurso persistido          |
| Message type             | Parcial     | `Message.metadata` e `MessageAttachment.kind` | Sim   | Normalização existente                     |
| MIME type                | Sim         | `MessageAttachment.mimeType`                  | Sim   | Validar coerência com `kind`               |
| Filename                 | Sim         | `MessageAttachment.fileName`                  | Sim   | Renderizar como texto e truncar            |
| Size                     | Sim         | `MessageAttachment.fileSize`                  | Sim   | Formatação existente                       |
| Media URL                | Sim         | `MessageAttachment.url`                       | Sim   | Resolver pelo helper existente             |
| Storage key              | Não         | —                                             | Não   | Storage local usa URL relativa estável     |
| Thumbnail                | Não         | —                                             | Não   | Player mantém fallback                     |
| Duration/dimensões       | Não         | —                                             | Não   | Não inventar metadata                      |
| Direction                | Sim         | `Message.direction`                           | Sim   | Exibir recebido/enviado                    |
| Message timestamp        | Sim         | `Message.sentAt`                              | Sim   | Snapshot no vínculo                        |
| Deal relation            | Sim         | `Deal.conversationId`                         | Sim   | Validar no backend                         |
| Conversation relation    | Sim         | `Message.conversationId`                      | Sim   | Preservar origem                           |
| Organization relation    | Indireta    | `Conversation.organizationId`                 | Sim   | Validar e persistir diretamente            |
| Saved by / saved at      | Não existia | —                                             | Sim   | Novo `LeadFile`                            |
| Existing deal file model | Não         | —                                             | Não   | Cliente apontava para endpoint inexistente |
| Existing storage         | Sim         | filesystem em `UPLOAD_DIR`                    | Sim   | Nenhuma cópia do binário                   |

## Decisão

Foi criado `LeadFile` como referência curada. Ele aponta para deal, conversa, mensagem e attachment, registra usuário/data do save e mantém snapshots mínimos de metadados. A URL original é reutilizada; nenhum upload ou binary adicional é produzido. Mensagem e attachment usam `SET NULL` no vínculo curado, evitando exclusão em cascata do registro de Arquivos. O storage atual não usa signed URLs nem expõe paths físicos ao navegador.
