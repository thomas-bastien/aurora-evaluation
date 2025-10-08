-- Phase 1: Database Migration for Admin System (Core Only)

-- 1. Create admins table (similar to jurors)
CREATE TABLE IF NOT EXISTS public.admins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    job_title text,
    organization text,
    linkedin_url text,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    invitation_token uuid DEFAULT gen_random_uuid(),
    invitation_sent_at timestamptz,
    invitation_expires_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Enable RLS on admins table
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policy for admins
CREATE POLICY "Admins can manage all admin records"
    ON public.admins FOR ALL
    USING (get_current_user_role() = 'admin');

-- 4. Delete CM roles where user already has admin role (prevent duplicates)
DELETE FROM public.user_roles 
WHERE role = 'cm' 
AND user_id IN (
    SELECT user_id 
    FROM public.user_roles 
    WHERE role = 'admin'
);

-- 5. Convert remaining CM users to admin role
UPDATE public.user_roles 
SET role = 'admin' 
WHERE role = 'cm';

-- 6. Migrate existing community_managers data to admins table (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_managers') THEN
        INSERT INTO public.admins (id, name, email, job_title, organization, linkedin_url, user_id, invitation_token, invitation_sent_at, invitation_expires_at, created_at, updated_at)
        SELECT id, name, email, job_title, organization, linkedin_url, user_id, invitation_token, invitation_sent_at, invitation_expires_at, created_at, updated_at
        FROM public.community_managers
        WHERE user_id IS NOT NULL
        ON CONFLICT (email) DO NOTHING;
    END IF;
END $$;

-- 7. Drop CM-related tables
DROP TABLE IF EXISTS public.role_change_audit CASCADE;
DROP TABLE IF EXISTS public.community_managers CASCADE;