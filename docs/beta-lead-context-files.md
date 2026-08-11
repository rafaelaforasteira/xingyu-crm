# Arquivos curados no contexto do lead

## Conceito

A Conversation continua sendo o histórico completo. **Arquivos** contém somente mídias e documentos que uma pessoa da equipe escolheu preservar com **Guardar em Arquivos**. Nenhuma mídia entra automaticamente nessa pasta.

São elegíveis imagens, vídeos, áudios, mensagens de voz e documentos, tanto inbound quanto outbound. Texto, sticker e tipos sem attachment persistido são excluídos. Em mensagens com vários attachments, cada item é salvo ou removido separadamente; captions e status da mensagem não mudam.

## Persistência e lifecycle

`LeadFile` referencia o `MessageAttachment` existente e registra organização, deal, conversa, mensagem, `savedBy` e `savedAt`. A restrição única `(dealId, attachmentId)` garante idempotência. O binário e a URL não são duplicados. Remover dos Arquivos apaga somente a referência curada; Conversation, Message, attachment e objeto de storage permanecem.

Snapshots de nome, MIME, tamanho, URL, direção e data da mensagem permitem manter contexto operacional se referências de origem forem removidas futuramente. Garbage collection agressivo não faz parte deste beta; uma política futura deverá respeitar mídias deliberadamente preservadas.

## Interface

O menu discreto da mensagem aparece para attachments elegíveis e permanece acessível por toque. Depois do save, mostra o estado salvo e a ação de remoção. O contador e as duas superfícies usam `queryKeys.deals.files`, portanto mutations atualizam o menu, a lista compacta e o contexto.

A seção mostra até três arquivos, em `savedAt DESC`, com ícone, nome truncado e momento da mensagem. O diálogo completo permanece na conversa. O detalhe reutiliza os players de vídeo, áudio e documento e apresenta origem, MIME, tamanho, momento original, usuário e momento do save.

## Segurança e evolução

O frontend envia apenas `messageId` e `attachmentId`; o backend resolve URL e metadados, verifica organização, deal, conversa, tipo e MIME. Filenames são texto React. O storage local retorna rota relativa da aplicação, não path do filesystem. Upload manual, categorias, tags, OCR, IA e link de foco para a mensagem original ficam para versões futuras.
