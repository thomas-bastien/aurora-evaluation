-- Fix the recommendation constraint issue by using proper values
INSERT INTO public.evaluations (startup_id, evaluator_id, team_score, product_score, market_score, traction_score, financials_score, overall_score, status, recommendation)
SELECT 
  s.id,
  p.user_id,
  (RANDOM() * 4 + 6)::integer, -- Random score between 6-10
  (RANDOM() * 4 + 6)::integer,
  (RANDOM() * 4 + 6)::integer,
  (RANDOM() * 4 + 6)::integer,
  (RANDOM() * 4 + 6)::integer,
  (RANDOM() * 4 + 6)::numeric(3,1),
  'completed',
  CASE 
    WHEN RANDOM() > 0.7 THEN 'yes'
    WHEN RANDOM() > 0.3 THEN 'maybe'
    ELSE 'no'
  END
FROM public.startups s
CROSS JOIN (SELECT user_id FROM public.profiles WHERE role = 'vc' LIMIT 3) p
WHERE s.id IN (
  SELECT id FROM public.startups 
  ORDER BY RANDOM() 
  LIMIT 15
);

-- Update sample VC profiles with expertise and investment stages
UPDATE public.profiles 
SET 
  expertise = ARRAY['AI/ML', 'SaaS', 'Fintech'],
  investment_stages = ARRAY['seed', 'series-a'],
  calendly_link = 'https://calendly.com/vc-partner'
WHERE role = 'vc';

-- Link startups to sessions (simplified)
INSERT INTO public.startup_sessions (startup_id, session_id, order_index)
SELECT 
  s.id,
  sess.id,
  ROW_NUMBER() OVER (PARTITION BY sess.id ORDER BY s.name)
FROM public.startups s
CROSS JOIN public.sessions sess
LIMIT 20;