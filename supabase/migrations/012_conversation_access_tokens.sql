-- 012: Opaque conversation access tokens
--
-- Guest chat access (src/lib/chat/auth.ts) previously authorized customers
-- purely by matching conversations.customer_email against an email passed
-- as a GET query parameter. Two problems: (1) the email travels in query
-- strings -- server access logs, browser history, any intermediate proxy
-- -- and (2) anyone who simply *knows* a customer's email (not exactly a
-- secret) plus can learn/guess a booking_id could read that customer's
-- messages. This adds a random, unguessable per-conversation token that
-- the client is given once (at creation) and uses thereafter instead.
-- Email-match stays as a fallback recovery path only.

ALTER TABLE conversations ADD COLUMN access_token VARCHAR(64);

-- 2x UUIDv4 concatenated = 244 bits of randomness, no pgcrypto extension needed.
UPDATE conversations
SET access_token = replace(uuid_generate_v4()::text || uuid_generate_v4()::text, '-', '')
WHERE access_token IS NULL;

ALTER TABLE conversations
    ALTER COLUMN access_token SET DEFAULT replace(uuid_generate_v4()::text || uuid_generate_v4()::text, '-', ''),
    ALTER COLUMN access_token SET NOT NULL,
    ADD CONSTRAINT conversations_access_token_unique UNIQUE (access_token);

CREATE INDEX idx_conversations_access_token ON conversations(access_token);
