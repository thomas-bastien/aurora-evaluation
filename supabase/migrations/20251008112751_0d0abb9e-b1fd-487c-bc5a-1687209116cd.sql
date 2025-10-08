-- Step 1: Create role enum and user_roles table for proper security
CREATE TYPE public.app_role AS ENUM ('admin', 'cm', 'vc');

-- User roles table (CRITICAL: Roles must be in separate table for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'cm' THEN 2
      WHEN 'vc' THEN 3
    END
  LIMIT 1
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins and CMs can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cm'));

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Step 2: Migrate existing roles from profiles table
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role::text::app_role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 3: Create community_managers table
CREATE TABLE public.community_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  job_title TEXT,
  organization TEXT,
  linkedin_url TEXT,
  
  -- Invitation system
  invitation_token UUID DEFAULT gen_random_uuid() UNIQUE,
  invitation_sent_at TIMESTAMPTZ,
  invitation_expires_at TIMESTAMPTZ,
  
  -- Permissions
  permissions JSONB DEFAULT '{"can_invite_cms": true, "can_manage_jurors": true, "can_manage_startups": true}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.community_managers ENABLE ROW LEVEL SECURITY;

-- RLS policies for community_managers
CREATE POLICY "Admins and CMs can view all CMs"
  ON public.community_managers
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cm'));

CREATE POLICY "Admins and CMs can manage CMs"
  ON public.community_managers
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'cm'));

-- Trigger for updated_at
CREATE TRIGGER update_community_managers_updated_at
  BEFORE UPDATE ON public.community_managers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Update get_current_user_role function to use new table
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text 
  FROM public.user_roles 
  WHERE user_id = auth.uid()
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'cm' THEN 2
      WHEN 'vc' THEN 3
    END
  LIMIT 1
$$;