-- Skip evaluations for now and just add the VC profile updates and session assignments
UPDATE public.profiles 
SET 
  expertise = ARRAY['AI/ML', 'SaaS', 'Fintech'],
  investment_stages = ARRAY['seed', 'series-a'],
  calendly_link = 'https://calendly.com/vc-partner'
WHERE role = 'vc';

-- Link some startups to sessions (simplified approach)
INSERT INTO public.startup_sessions (startup_id, session_id, order_index)
SELECT DISTINCT
  s.id,
  sess.id,
  ROW_NUMBER() OVER (PARTITION BY sess.id ORDER BY s.name)
FROM public.startups s
CROSS JOIN public.sessions sess
WHERE sess.id IN (SELECT id FROM public.sessions LIMIT 4)
  AND s.id IN (SELECT id FROM public.startups ORDER BY RANDOM() LIMIT 20)
LIMIT 20;