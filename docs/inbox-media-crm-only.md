# Inbox media — CRM only (homologation)

Branch: `feature/homologation-foundation`

## Scope

Message attachments (images, videos, documents, and browser-recorded audio) are:

1. Validated and stored on the API host under `UPLOAD_DIR`
2. Linked via `MessageAttachment`
3. Served at `/api/uploads/files/:randomName`
4. Displayed inside the CRM conversation UI

## Out of scope (this round)

- Sending media to WhatsApp / Meta Cloud API
- Stickers, GIFs, location, contact cards
- Voice/video calls
- Audio transcription
- Advanced video compression

A future WhatsApp adapter should reuse the same `MessageAttachment` rows and upload pipeline rather than inventing a second storage model.
