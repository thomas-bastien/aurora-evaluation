-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('vc', 'admin');

-- Drop the default constraint first
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- Update all existing role values to 'vc'
UPDATE public.profiles SET role = 'vc' WHERE role IS NOT NULL;

-- Change the column type to use the enum
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.user_role 
USING CASE 
  WHEN role = 'evaluator' THEN 'vc'::public.user_role
  WHEN role = 'vc' THEN 'vc'::public.user_role
  WHEN role = 'admin' THEN 'admin'::public.user_role
  ELSE 'vc'::public.user_role
END;

-- Set the new default
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'vc'::public.user_role;