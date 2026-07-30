-- Incremental indexes for omnichannel inbox list and message pagination.
-- Uses IF NOT EXISTS so re-applying is safe on environments that already have them.

CREATE INDEX IF NOT EXISTS "Conversation_organizationId_lastMessageAt_idx"
  ON "Conversation"("organizationId", "lastMessageAt");

CREATE INDEX IF NOT EXISTS "Conversation_organizationId_channelId_lastMessageAt_idx"
  ON "Conversation"("organizationId", "channelId", "lastMessageAt");

CREATE INDEX IF NOT EXISTS "Conversation_organizationId_assigneeId_status_idx"
  ON "Conversation"("organizationId", "assigneeId", "status");

CREATE INDEX IF NOT EXISTS "Message_conversationId_sentAt_idx"
  ON "Message"("conversationId", "sentAt");
