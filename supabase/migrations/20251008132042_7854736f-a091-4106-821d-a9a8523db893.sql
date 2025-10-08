-- Backfill user_roles for existing jurors
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT j.user_id, 'vc'::app_role
FROM public.jurors j
WHERE j.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = j.user_id AND ur.role = 'vc'::app_role
  );

-- Backfill user_roles for existing community managers
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT cm.user_id, 'cm'::app_role
FROM public.community_managers cm
WHERE cm.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = cm.user_id AND ur.role = 'cm'::app_role
  );