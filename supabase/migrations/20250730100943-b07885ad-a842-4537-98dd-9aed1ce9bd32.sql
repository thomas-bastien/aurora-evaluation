-- Update the role column to use specific enum values for VCs and Admins
CREATE TYPE public.user_role AS ENUM ('vc', 'admin');

-- Update the profiles table to use the new enum
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE public.user_role 
USING CASE 
  WHEN role = 'evaluator' THEN 'vc'::public.user_role
  ELSE 'vc'::public.user_role
END;

-- Set default to 'vc'
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'vc'::public.user_role;