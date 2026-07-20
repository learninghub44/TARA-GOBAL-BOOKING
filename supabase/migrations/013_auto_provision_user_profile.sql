-- 013: Auto-provision public.users row on signup
--
-- Root cause of "dashboard not loading": auth/register/page.tsx signs the
-- user up with supabase.auth.signUp(), then tries to client-side INSERT a
-- matching row into public.users. But the users table has no INSERT policy
-- for regular users (rls_policies.sql only grants service_role FOR ALL,
-- plus SELECT/UPDATE policies for "own profile") -- so that insert is
-- always rejected by RLS. It also fails silently (console.error only), and
-- even if it were allowed, signUp() returns a null session while email
-- confirmation is pending, so auth.uid() is null in that request anyway.
--
-- Net effect: no public.users row ever gets created. Every downstream
-- read (getCurrentUser, vendor dashboard, admin dashboard, vendor register's
-- "update tenant_id" step) does `.eq('id', user.id).single()` against an
-- empty result set, throws, and the page either infinite-spins, shows
-- "Failed to load dashboard data", or silently redirects to '/'.
--
-- Fix: provision the row from the server via a SECURITY DEFINER trigger on
-- auth.users, the standard Supabase pattern. This runs with elevated
-- privileges and doesn't depend on the client's session state, so it works
-- immediately on signup regardless of email-confirmation settings.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    INSERT INTO public.users (id, email, first_name, last_name, role, is_active, email_verified)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        'owner', -- Default role for self-registered accounts; they become a
                 -- vendor owner once they complete /vendor/register, or stay
                 -- tenant-less until then.
        TRUE,
        NEW.email_confirmed_at IS NOT NULL
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

-- Keep public.users.email_verified in sync when the user clicks the
-- confirmation link (auth.users.email_confirmed_at gets set after insert).
CREATE OR REPLACE FUNCTION public.handle_auth_user_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
        UPDATE public.users
        SET email_verified = TRUE, email_verified_at = NEW.email_confirmed_at
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_confirmed();

REVOKE EXECUTE ON FUNCTION public.handle_auth_user_confirmed() FROM PUBLIC, anon, authenticated;

-- Backfill: any auth.users that signed up before this migration and never
-- got a matching public.users row (the exact symptom this migration fixes).
INSERT INTO public.users (id, email, first_name, last_name, role, is_active, email_verified)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'first_name', split_part(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'last_name', ''),
    'owner',
    TRUE,
    au.email_confirmed_at IS NOT NULL
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;
