-- Migration 004: Add message_type to chat_messages for deterministic dedup
--
-- Notification messages (from approval router) must be distinguishable from
-- regular chat messages (from SSE route) without content-sniffing.

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'chat'
  CHECK (message_type IN ('chat', 'notification'));
