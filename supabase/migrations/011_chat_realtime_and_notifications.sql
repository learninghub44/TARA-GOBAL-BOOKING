-- 011: Realtime chat + notifications
--
-- The `conversations` and `messages` tables (and their RLS policies) already
-- existed in schema.sql but were never (a) added to the supabase_realtime
-- publication, so no client could subscribe to new messages, or (b) used by
-- any app code (verified: no src/ references before this migration).
-- Also adds a notifications table (didn't exist) so staff/customers get a
-- lightweight in-app alert when a new message arrives, and a trigger to
-- keep reviews.helpful_count / not_helpful_count in sync with review_votes
-- (also previously unused).

-- ============================================
-- 1. Enable Realtime on chat tables
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- ============================================
-- 2. Notifications table
-- ============================================

CREATE TYPE notification_type AS ENUM ('new_message', 'booking_update', 'review_reply', 'system');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255),
    type notification_type NOT NULL DEFAULT 'system',
    title VARCHAR(255) NOT NULL,
    body TEXT,
    link_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT notifications_recipient_check CHECK (user_id IS NOT NULL OR recipient_email IS NOT NULL)
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_recipient_email ON notifications(recipient_email, is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage notifications" ON notifications
    FOR ALL USING (auth.role() = 'service_role');

-- Logged-in users (staff) can read/update their own notifications.
-- Guest customers (recipient_email only, no user_id) have no direct DB
-- access -- they read notifications through an API route using the admin
-- client, same pattern as bookings/reviews.
CREATE POLICY "Users can read own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can mark own notifications read" ON notifications
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================
-- 3. Notify on new chat message
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_conversation conversations%ROWTYPE;
    v_preview TEXT;
BEGIN
    SELECT * INTO v_conversation FROM conversations WHERE id = NEW.conversation_id;
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    v_preview := LEFT(NEW.content, 140);

    IF NEW.sender_type = 'customer' THEN
        -- Notify the assigned staff member, if any.
        IF v_conversation.staff_id IS NOT NULL THEN
            INSERT INTO notifications (tenant_id, user_id, type, title, body, link_url)
            VALUES (
                v_conversation.tenant_id,
                v_conversation.staff_id,
                'new_message',
                COALESCE('New message from ' || v_conversation.customer_name, 'New message'),
                v_preview,
                '/admin/messages/' || v_conversation.id
            );
        END IF;
    ELSE
        -- Staff replied -- notify the customer (only possible if they're a
        -- registered user; guest customers see new messages via the chat
        -- window itself, which polls/subscribes on the conversation).
        IF v_conversation.customer_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, title, body, link_url)
            VALUES (
                v_conversation.customer_id,
                'new_message',
                'New reply to your message',
                v_preview,
                '/account/messages/' || v_conversation.id
            );
        END IF;
    END IF;

    UPDATE conversations SET last_message_at = NEW.created_at, updated_at = NOW() WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_message ON messages;
CREATE TRIGGER trg_notify_new_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

REVOKE EXECUTE ON FUNCTION public.notify_new_message() FROM PUBLIC, anon, authenticated;

-- ============================================
-- 4. Keep reviews.helpful_count / not_helpful_count in sync with review_votes
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_review_vote_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_review_id UUID;
BEGIN
    v_review_id := COALESCE(NEW.review_id, OLD.review_id);

    UPDATE reviews SET
        helpful_count = (SELECT COUNT(*) FROM review_votes WHERE review_id = v_review_id AND vote_type = 'helpful'),
        not_helpful_count = (SELECT COUNT(*) FROM review_votes WHERE review_id = v_review_id AND vote_type = 'not_helpful')
    WHERE id = v_review_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_review_vote_counts ON review_votes;
CREATE TRIGGER trg_sync_review_vote_counts
    AFTER INSERT OR UPDATE OR DELETE ON review_votes
    FOR EACH ROW EXECUTE FUNCTION public.sync_review_vote_counts();

REVOKE EXECUTE ON FUNCTION public.sync_review_vote_counts() FROM PUBLIC, anon, authenticated;

-- No public UPDATE policy on review_votes: the vote route upserts via the
-- service-role (admin) client server-side, which bypasses RLS. An
-- anon-facing "update own vote" policy would just reintroduce the
-- always-true-USING linter finding for no real benefit, since
-- voter_identifier isn't tied to auth.uid() anyway.
