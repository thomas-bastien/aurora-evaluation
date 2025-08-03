-- Add more evaluation sessions
INSERT INTO sessions (name, description, category, scheduled_date, time_slot, status, vc_participants, completion_rate, avg_score)
VALUES 
  ('Q1 2024 Evaluation Round', 'First quarter startup evaluations for series A readiness', 'evaluation', '2024-03-15', 'morning', 'completed', 8, 95, 7.8),
  ('FinTech Focus Session', 'Specialized evaluation for financial technology startups', 'evaluation', '2024-03-22', 'afternoon', 'completed', 6, 100, 8.2),
  ('Healthcare Innovation Review', 'Deep dive into healthcare and biotech startups', 'evaluation', '2024-04-05', 'morning', 'completed', 5, 90, 7.5),
  ('Enterprise SaaS Assessment', 'Evaluation of B2B software solutions', 'evaluation', '2024-04-12', 'afternoon', 'in-progress', 7, 71, 7.9),
  ('Consumer Tech Showcase', 'Consumer-facing technology and apps review', 'evaluation', '2024-04-19', 'morning', 'scheduled', 6, 0, null),
  ('AI/ML Innovation Panel', 'Artificial intelligence and machine learning startups', 'evaluation', '2024-04-26', 'afternoon', 'scheduled', 8, 0, null);

-- Update existing VC profiles with more details
UPDATE profiles 
SET 
  organization = CASE 
    WHEN full_name LIKE '%John%' THEN 'Sequoia Capital'
    WHEN full_name LIKE '%Sarah%' THEN 'Andreessen Horowitz'
    WHEN full_name LIKE '%Michael%' THEN 'General Catalyst'
    WHEN full_name LIKE '%Emily%' THEN 'Kleiner Perkins'
    WHEN full_name LIKE '%David%' THEN 'Accel Partners'
    ELSE 'Benchmark Capital'
  END,
  expertise = CASE 
    WHEN full_name LIKE '%John%' THEN ARRAY['fintech', 'enterprise', 'ai']
    WHEN full_name LIKE '%Sarah%' THEN ARRAY['consumer', 'marketplace', 'mobile']
    WHEN full_name LIKE '%Michael%' THEN ARRAY['healthcare', 'biotech', 'ai']
    WHEN full_name LIKE '%Emily%' THEN ARRAY['cybersecurity', 'enterprise', 'devtools']
    WHEN full_name LIKE '%David%' THEN ARRAY['saas', 'productivity', 'workflow']
    ELSE ARRAY['consumer', 'social', 'content']
  END,
  investment_stages = CASE 
    WHEN full_name LIKE '%John%' THEN ARRAY['series-a', 'series-b']
    WHEN full_name LIKE '%Sarah%' THEN ARRAY['seed', 'series-a']
    WHEN full_name LIKE '%Michael%' THEN ARRAY['series-a', 'series-b', 'series-c']
    WHEN full_name LIKE '%Emily%' THEN ARRAY['seed', 'series-a']
    WHEN full_name LIKE '%David%' THEN ARRAY['series-a', 'series-b']
    ELSE ARRAY['seed']
  END,
  calendly_link = CASE 
    WHEN full_name LIKE '%John%' THEN 'https://calendly.com/john-smith'
    WHEN full_name LIKE '%Sarah%' THEN 'https://calendly.com/sarah-johnson'
    WHEN full_name LIKE '%Michael%' THEN 'https://calendly.com/michael-chen'
    WHEN full_name LIKE '%Emily%' THEN 'https://calendly.com/emily-davis'
    WHEN full_name LIKE '%David%' THEN 'https://calendly.com/david-wilson'
    ELSE 'https://calendly.com/vc-partner'
  END
WHERE role = 'vc';

-- Add comprehensive evaluations using existing VCs and startups
WITH evaluation_data AS (
  SELECT 
    p.user_id as vc_id,
    s.id as startup_id,
    ROW_NUMBER() OVER (ORDER BY p.created_at, s.created_at) as eval_order
  FROM profiles p
  CROSS JOIN startups s
  WHERE p.role = 'vc'
  AND NOT EXISTS (
    SELECT 1 FROM evaluations e 
    WHERE e.evaluator_id = p.user_id AND e.startup_id = s.id
  )
)
INSERT INTO evaluations (
  evaluator_id, startup_id, status, 
  team_score, team_feedback,
  product_score, product_feedback,
  market_score, market_feedback,
  traction_score, traction_feedback,
  financials_score, financials_feedback,
  overall_score, overall_notes,
  recommendation, investment_amount
)
SELECT 
  vc_id,
  startup_id,
  CASE 
    WHEN eval_order % 12 = 0 THEN 'draft'
    ELSE 'completed'
  END,
  -- Team scores (6-9 range)
  6 + (abs(hashtext(vc_id::text || startup_id::text || 'team')) % 4),
  CASE (abs(hashtext(vc_id::text || startup_id::text || 'team_feedback')) % 4)
    WHEN 0 THEN 'Strong founding team with complementary skills and proven track record in the industry.'
    WHEN 1 THEN 'Experienced leadership but could benefit from additional technical expertise.'
    WHEN 2 THEN 'Promising team composition with good domain knowledge and execution capabilities.'
    ELSE 'Well-rounded team with strong technical and business backgrounds.'
  END,
  -- Product scores (5-9 range)
  5 + (abs(hashtext(vc_id::text || startup_id::text || 'product')) % 5),
  CASE (abs(hashtext(vc_id::text || startup_id::text || 'product_feedback')) % 4)
    WHEN 0 THEN 'Innovative solution addressing a clear market need with strong technical implementation.'
    WHEN 1 THEN 'Good product-market fit potential but needs refinement in user experience.'
    WHEN 2 THEN 'Solid MVP with room for feature expansion and market validation.'
    ELSE 'Compelling value proposition with scalable technology architecture.'
  END,
  -- Market scores (4-9 range)
  4 + (abs(hashtext(vc_id::text || startup_id::text || 'market')) % 6),
  CASE (abs(hashtext(vc_id::text || startup_id::text || 'market_feedback')) % 4)
    WHEN 0 THEN 'Large addressable market with clear growth potential and favorable trends.'
    WHEN 1 THEN 'Competitive landscape but opportunity for differentiation and market capture.'
    WHEN 2 THEN 'Emerging market with significant upside potential as adoption increases.'
    ELSE 'Well-defined target market with validated customer segments and demand.'
  END,
  -- Traction scores (3-8 range)
  3 + (abs(hashtext(vc_id::text || startup_id::text || 'traction')) % 6),
  CASE (abs(hashtext(vc_id::text || startup_id::text || 'traction_feedback')) % 4)
    WHEN 0 THEN 'Strong customer acquisition metrics with healthy retention and growth rates.'
    WHEN 1 THEN 'Early traction indicators are positive with accelerating momentum.'
    WHEN 2 THEN 'Good product adoption but needs to demonstrate sustainable growth.'
    ELSE 'Solid early customers providing valuable feedback and validation.'
  END,
  -- Financials scores (4-8 range)
  4 + (abs(hashtext(vc_id::text || startup_id::text || 'financials')) % 5),
  CASE (abs(hashtext(vc_id::text || startup_id::text || 'financials_feedback')) % 4)
    WHEN 0 THEN 'Sound financial planning with clear path to profitability and efficient capital use.'
    WHEN 1 THEN 'Reasonable burn rate but needs clearer revenue model validation.'
    WHEN 2 THEN 'Good financial discipline with opportunity to optimize unit economics.'
    ELSE 'Solid financial foundation with transparent reporting and realistic projections.'
  END,
  -- Overall score (calculated average with slight variation)
  6.5 + (abs(hashtext(vc_id::text || startup_id::text || 'overall')) % 3) * 0.5,
  CASE (abs(hashtext(vc_id::text || startup_id::text || 'overall_notes')) % 3)
    WHEN 0 THEN 'Strong overall opportunity with experienced team and clear market potential. Recommend proceeding to due diligence.'
    WHEN 1 THEN 'Solid fundamentals across most areas with some execution risk. Worth continued monitoring and potential follow-up.'
    ELSE 'Good foundation but needs to demonstrate stronger traction metrics before investment consideration.'
  END,
  -- Recommendation based on overall score
  CASE 
    WHEN 6.5 + (abs(hashtext(vc_id::text || startup_id::text || 'overall')) % 3) * 0.5 >= 8.0 THEN 'strong_yes'
    WHEN 6.5 + (abs(hashtext(vc_id::text || startup_id::text || 'overall')) % 3) * 0.5 >= 7.5 THEN 'yes'
    WHEN 6.5 + (abs(hashtext(vc_id::text || startup_id::text || 'overall')) % 3) * 0.5 >= 6.5 THEN 'maybe'
    ELSE 'no'
  END,
  -- Investment amount (500K to 5M range)
  500000 + (abs(hashtext(vc_id::text || startup_id::text || 'investment')) % 4500000)
FROM evaluation_data
WHERE eval_order <= 50;

-- Add pitch requests for highly-rated startups
WITH top_evaluations AS (
  SELECT 
    e.startup_id,
    e.evaluator_id,
    e.overall_score,
    p.calendly_link,
    ROW_NUMBER() OVER (ORDER BY e.overall_score DESC) as ranking
  FROM evaluations e
  JOIN profiles p ON e.evaluator_id = p.user_id
  WHERE e.status = 'completed' 
  AND e.overall_score >= 7.5
  AND p.calendly_link IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM pitch_requests pr 
    WHERE pr.startup_id = e.startup_id AND pr.vc_id = e.evaluator_id
  )
)
INSERT INTO pitch_requests (startup_id, vc_id, calendly_link, status, request_date, pitch_date)
SELECT 
  startup_id,
  evaluator_id,
  calendly_link,
  CASE (ranking % 4)
    WHEN 0 THEN 'completed'
    WHEN 1 THEN 'scheduled'
    WHEN 2 THEN 'confirmed'
    ELSE 'pending'
  END,
  NOW() - INTERVAL '5 days' + (ranking || ' hours')::INTERVAL,
  CASE (ranking % 4)
    WHEN 0 THEN NOW() + INTERVAL '2 days' + (ranking || ' hours')::INTERVAL
    WHEN 1 THEN NOW() + INTERVAL '5 days' + (ranking || ' hours')::INTERVAL
    WHEN 2 THEN NOW() + INTERVAL '7 days' + (ranking || ' hours')::INTERVAL
    ELSE NULL
  END
FROM top_evaluations
WHERE ranking <= 25;