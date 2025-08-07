/*
  # Add More Investors to Aurora Platform

  1. New Investor Profiles
    - Add 8 new VC profiles with diverse backgrounds
    - Include expertise areas, investment stages, and organizations
    - Set up Calendly links for meeting scheduling

  2. Investment Focus Areas
    - AI/ML specialists
    - Healthcare and biotech experts
    - Fintech and enterprise software VCs
    - Consumer and marketplace investors
    - Deep tech and hardware specialists

  3. Organizations
    - Top-tier VC firms representation
    - Diverse investment stages coverage
    - Geographic distribution
*/

-- Insert additional VC investor profiles
INSERT INTO profiles (user_id, full_name, organization, role, expertise, investment_stages, calendly_link) VALUES
-- AI/ML Specialists
(gen_random_uuid(), 'Dr. Priya Patel', 'Khosla Ventures', 'vc', ARRAY['ai', 'machine-learning', 'computer-vision', 'nlp'], ARRAY['seed', 'series-a'], 'https://calendly.com/priya-patel'),
(gen_random_uuid(), 'James Liu', 'NEA (New Enterprise Associates)', 'vc', ARRAY['ai', 'robotics', 'autonomous-systems'], ARRAY['series-a', 'series-b'], 'https://calendly.com/james-liu'),

-- Healthcare & Biotech Experts
(gen_random_uuid(), 'Dr. Rachel Martinez', 'Flagship Pioneering', 'vc', ARRAY['biotech', 'pharmaceuticals', 'medical-devices', 'digital-health'], ARRAY['seed', 'series-a', 'series-b'], 'https://calendly.com/rachel-martinez'),
(gen_random_uuid(), 'Dr. Kevin Zhang', 'Andreessen Horowitz Bio Fund', 'vc', ARRAY['digital-health', 'healthtech', 'telemedicine', 'health-ai'], ARRAY['seed', 'series-a'], 'https://calendly.com/kevin-zhang'),

-- Fintech & Enterprise Software
(gen_random_uuid(), 'Alexandra Foster', 'Ribbit Capital', 'vc', ARRAY['fintech', 'payments', 'cryptocurrency', 'financial-services'], ARRAY['seed', 'series-a', 'series-b'], 'https://calendly.com/alexandra-foster'),
(gen_random_uuid(), 'Robert Chen', 'Index Ventures', 'vc', ARRAY['enterprise-software', 'saas', 'productivity', 'workflow-automation'], ARRAY['series-a', 'series-b', 'series-c'], 'https://calendly.com/robert-chen'),

-- Consumer & Marketplace
(gen_random_uuid(), 'Maria Gonzalez', 'Lightspeed Venture Partners', 'vc', ARRAY['consumer', 'marketplace', 'e-commerce', 'social-commerce'], ARRAY['seed', 'series-a'], 'https://calendly.com/maria-gonzalez'),
(gen_random_uuid(), 'Daniel Park', 'Bessemer Venture Partners', 'vc', ARRAY['consumer-apps', 'gaming', 'entertainment', 'creator-economy'], ARRAY['pre-seed', 'seed'], 'https://calendly.com/daniel-park'),

-- Deep Tech & Hardware
(gen_random_uuid(), 'Dr. Sophie Williams', 'Lux Capital', 'vc', ARRAY['deep-tech', 'hardware', 'semiconductors', 'quantum-computing'], ARRAY['seed', 'series-a', 'series-b'], 'https://calendly.com/sophie-williams'),
(gen_random_uuid(), 'Thomas Anderson', 'Founders Fund', 'vc', ARRAY['space-tech', 'defense-tech', 'advanced-manufacturing', 'materials'], ARRAY['series-a', 'series-b', 'growth'], 'https://calendly.com/thomas-anderson'),

-- Climate & Sustainability
(gen_random_uuid(), 'Dr. Elena Petrov', 'Breakthrough Energy Ventures', 'vc', ARRAY['climate-tech', 'clean-energy', 'sustainability', 'carbon-capture'], ARRAY['seed', 'series-a'], 'https://calendly.com/elena-petrov'),
(gen_random_uuid(), 'Marcus Johnson', 'Energy Impact Partners', 'vc', ARRAY['energy-tech', 'smart-grid', 'battery-tech', 'renewable-energy'], ARRAY['series-a', 'series-b'], 'https://calendly.com/marcus-johnson'),

-- Emerging Markets & Global
(gen_random_uuid(), 'Ananya Sharma', 'Sequoia Capital India', 'vc', ARRAY['emerging-markets', 'mobile-first', 'payments', 'logistics'], ARRAY['seed', 'series-a'], 'https://calendly.com/ananya-sharma'),
(gen_random_uuid(), 'Carlos Rodriguez', 'Kaszek Ventures', 'vc', ARRAY['latin-america', 'fintech', 'e-commerce', 'logistics'], ARRAY['seed', 'series-a', 'series-b'], 'https://calendly.com/carlos-rodriguez'),

-- Cybersecurity & Infrastructure
(gen_random_uuid(), 'Jennifer Kim', 'CRV (Charles River Ventures)', 'vc', ARRAY['cybersecurity', 'infrastructure', 'devtools', 'cloud-security'], ARRAY['seed', 'series-a'], 'https://calendly.com/jennifer-kim'),
(gen_random_uuid(), 'Michael O''Connor', 'Greylock Partners', 'vc', ARRAY['enterprise-security', 'data-infrastructure', 'developer-tools'], ARRAY['series-a', 'series-b'], 'https://calendly.com/michael-oconnor');

-- Update session assignments to include new VCs
WITH new_vcs AS (
  SELECT user_id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
  FROM profiles 
  WHERE role = 'vc' 
  AND created_at > NOW() - INTERVAL '1 minute'
  LIMIT 15
),
active_sessions AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY scheduled_date) as session_rn
  FROM sessions 
  WHERE status IN ('scheduled', 'in-progress')
)
INSERT INTO vc_sessions (vc_id, session_id, status)
SELECT 
  nv.user_id,
  s.id,
  CASE 
    WHEN s.session_rn <= 2 THEN 'assigned'
    ELSE 'assigned'
  END
FROM new_vcs nv
CROSS JOIN active_sessions s
WHERE (nv.rn + s.session_rn) % 3 = 0;

-- Update session participant counts
UPDATE sessions 
SET vc_participants = (
  SELECT COUNT(*) 
  FROM vc_sessions vs 
  WHERE vs.session_id = sessions.id
)
WHERE status IN ('scheduled', 'in-progress');

-- Add some evaluations from new VCs for existing startups
WITH new_vc_evaluations AS (
  SELECT 
    p.user_id as vc_id,
    s.id as startup_id,
    ROW_NUMBER() OVER (ORDER BY p.created_at DESC, s.created_at) as eval_order
  FROM profiles p
  CROSS JOIN startups s
  WHERE p.role = 'vc'
  AND p.created_at > NOW() - INTERVAL '1 minute'
  AND NOT EXISTS (
    SELECT 1 FROM evaluations e 
    WHERE e.evaluator_id = p.user_id AND e.startup_id = s.id
  )
)
INSERT INTO evaluations (
  evaluator_id, startup_id, status, 
  team_score, product_score, market_score, traction_score, financials_score,
  team_feedback, product_feedback, market_feedback, traction_feedback, financials_feedback,
  overall_score, overall_notes, recommendation, investment_amount
)
SELECT 
  vc_id,
  startup_id,
  CASE 
    WHEN eval_order % 8 = 0 THEN 'draft'
    WHEN eval_order % 5 = 0 THEN 'submitted'
    ELSE 'completed'
  END,
  -- Varied scoring based on VC expertise
  6 + (abs(hashtext(vc_id::text || startup_id::text || 'team')) % 4),
  5 + (abs(hashtext(vc_id::text || startup_id::text || 'product')) % 5),
  4 + (abs(hashtext(vc_id::text || startup_id::text || 'market')) % 6),
  3 + (abs(hashtext(vc_id::text || startup_id::text || 'traction')) % 6),
  4 + (abs(hashtext(vc_id::text || startup_id::text || 'financials')) % 5),
  -- Detailed feedback based on VC specialization
  CASE (abs(hashtext(vc_id::text || startup_id::text || 'team_feedback')) % 5)
    WHEN 0 THEN 'Exceptional founding team with deep domain expertise and proven execution track record.'
    WHEN 1 THEN 'Strong technical leadership but could benefit from additional business development expertise.'
    WHEN 2 THEN 'Well-balanced team with complementary skills, good cultural fit for scaling.'
    WHEN 3 THEN 'Promising founders but team needs strengthening in key areas before next funding round.'
    ELSE 'Solid team foundation with clear vision and strong commitment to the mission.'
  END,
  CASE (abs(hashtext(vc_id::text || startup_id::text || 'product_feedback')) % 5)
    WHEN 0 THEN 'Breakthrough technology with clear competitive moats and strong IP protection.'
    WHEN 1 THEN 'Innovative solution addressing real market pain points with scalable architecture.'
    WHEN 2 THEN 'Solid product-market fit demonstrated through customer adoption and retention.'
    WHEN 3 THEN 'Good MVP but needs significant product development before market readiness.'
    ELSE 'Compelling value proposition with room for feature expansion and market penetration.'
  END,
  CASE (abs(hashtext(vc_id::text || startup_id::text || 'market_feedback')) % 5)
    WHEN 0 THEN 'Massive addressable market with favorable regulatory trends and growing demand.'
    WHEN 1 THEN 'Large market opportunity with clear segmentation and go-to-market strategy.'
    WHEN 2 THEN 'Growing market with good timing and competitive positioning advantages.'
    WHEN 3 THEN 'Emerging market with significant upside but requires patient capital approach.'
    ELSE 'Well-defined market with validated customer segments and expansion opportunities.'
  END,
  CASE (abs(hashtext(vc_id::text || startup_id::text || 'traction_feedback')) % 5)
    WHEN 0 THEN 'Outstanding growth metrics with strong unit economics and customer satisfaction.'
    WHEN 1 THEN 'Solid traction indicators with accelerating momentum and improving metrics.'
    WHEN 2 THEN 'Good early validation with paying customers and positive feedback loops.'
    WHEN 3 THEN 'Early-stage traction but needs to demonstrate sustainable growth patterns.'
    ELSE 'Promising initial results with clear path to scaling customer acquisition.'
  END,
  CASE (abs(hashtext(vc_id::text || startup_id::text || 'financials_feedback')) % 5)
    WHEN 0 THEN 'Excellent financial discipline with clear path to profitability and efficient capital use.'
    WHEN 1 THEN 'Sound financial planning with realistic projections and appropriate burn rate.'
    WHEN 2 THEN 'Good financial foundation but needs to optimize unit economics for scaling.'
    WHEN 3 THEN 'Financial model needs refinement but underlying business fundamentals are solid.'
    ELSE 'Reasonable financial projections with opportunity to improve capital efficiency.'
  END,
  -- Overall score calculation
  6.0 + (abs(hashtext(vc_id::text || startup_id::text || 'overall')) % 4) * 0.75,
  CASE (abs(hashtext(vc_id::text || startup_id::text || 'overall_notes')) % 4)
    WHEN 0 THEN 'Outstanding investment opportunity with exceptional team, innovative product, and large market potential. Strongly recommend proceeding to term sheet.'
    WHEN 1 THEN 'Solid investment opportunity with good fundamentals across key areas. Recommend advancing to due diligence phase.'
    WHEN 2 THEN 'Interesting opportunity with some strengths but needs addressing key concerns before investment decision.'
    ELSE 'Mixed signals across evaluation criteria. Requires deeper analysis and follow-up before making investment recommendation.'
  END,
  -- Recommendation based on overall score
  CASE 
    WHEN 6.0 + (abs(hashtext(vc_id::text || startup_id::text || 'overall')) % 4) * 0.75 >= 8.5 THEN 'invest'
    WHEN 6.0 + (abs(hashtext(vc_id::text || startup_id::text || 'overall')) % 4) * 0.75 >= 7.0 THEN 'maybe'
    ELSE 'pass'
  END,
  -- Investment amount based on stage and score
  CASE 
    WHEN 6.0 + (abs(hashtext(vc_id::text || startup_id::text || 'overall')) % 4) * 0.75 >= 8.5 THEN 2000000 + (abs(hashtext(vc_id::text || startup_id::text || 'investment')) % 3000000)
    WHEN 6.0 + (abs(hashtext(vc_id::text || startup_id::text || 'overall')) % 4) * 0.75 >= 7.0 THEN 500000 + (abs(hashtext(vc_id::text || startup_id::text || 'investment')) % 2000000)
    ELSE 0
  END
FROM new_vc_evaluations
WHERE eval_order <= 30;

-- Add pitch requests for highly-rated startups from new VCs
WITH top_new_evaluations AS (
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
  AND p.created_at > NOW() - INTERVAL '1 minute'
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
  CASE (ranking % 5)
    WHEN 0 THEN 'completed'
    WHEN 1 THEN 'scheduled'
    WHEN 2 THEN 'confirmed'
    WHEN 3 THEN 'pending'
    ELSE 'declined'
  END,
  NOW() - INTERVAL '3 days' + (ranking || ' hours')::INTERVAL,
  CASE (ranking % 5)
    WHEN 0 THEN NOW() - INTERVAL '1 day' + (ranking || ' hours')::INTERVAL
    WHEN 1 THEN NOW() + INTERVAL '3 days' + (ranking || ' hours')::INTERVAL
    WHEN 2 THEN NOW() + INTERVAL '5 days' + (ranking || ' hours')::INTERVAL
    ELSE NULL
  END
FROM top_new_evaluations
WHERE ranking <= 15;

-- Create specialized investment sessions for new VCs
INSERT INTO sessions (name, description, category, scheduled_date, time_slot, status, vc_participants, completion_rate, avg_score) VALUES
('Deep Tech Innovation Summit', 'Specialized session for deep technology and hardware startups', 'Deep Tech', '2024-05-10', '09:00-17:00', 'scheduled', 6, 0, NULL),
('Healthcare AI Showcase', 'Focus on AI applications in healthcare and medical technology', 'HealthTech AI', '2024-05-15', '13:00-18:00', 'scheduled', 4, 0, NULL),
('Fintech Disruption Panel', 'Next-generation financial services and payment technologies', 'Fintech', '2024-05-20', '10:00-16:00', 'scheduled', 5, 0, NULL),
('Climate Tech Accelerator', 'Sustainable technology and climate solution startups', 'Climate Tech', '2024-05-25', '09:30-15:30', 'scheduled', 4, 0, NULL),
('Consumer Innovation Lab', 'Consumer-facing apps, marketplace, and social commerce', 'Consumer', '2024-06-01', '14:00-19:00', 'scheduled', 3, 0, NULL);

-- Assign new VCs to appropriate sessions based on their expertise
WITH vc_expertise_mapping AS (
  SELECT 
    p.user_id,
    p.expertise,
    CASE 
      WHEN 'ai' = ANY(p.expertise) OR 'machine-learning' = ANY(p.expertise) THEN 'Healthcare AI Showcase'
      WHEN 'deep-tech' = ANY(p.expertise) OR 'hardware' = ANY(p.expertise) THEN 'Deep Tech Innovation Summit'
      WHEN 'fintech' = ANY(p.expertise) OR 'payments' = ANY(p.expertise) THEN 'Fintech Disruption Panel'
      WHEN 'climate-tech' = ANY(p.expertise) OR 'clean-energy' = ANY(p.expertise) THEN 'Climate Tech Accelerator'
      WHEN 'consumer' = ANY(p.expertise) OR 'marketplace' = ANY(p.expertise) THEN 'Consumer Innovation Lab'
      ELSE 'Deep Tech Innovation Summit'
    END as preferred_session
  FROM profiles p
  WHERE p.role = 'vc'
  AND p.created_at > NOW() - INTERVAL '1 minute'
)
INSERT INTO vc_sessions (vc_id, session_id, status)
SELECT 
  vem.user_id,
  s.id,
  'assigned'
FROM vc_expertise_mapping vem
JOIN sessions s ON s.name = vem.preferred_session;

-- Update session participant counts for new sessions
UPDATE sessions 
SET vc_participants = (
  SELECT COUNT(*) 
  FROM vc_sessions vs 
  WHERE vs.session_id = sessions.id
)
WHERE name IN (
  'Deep Tech Innovation Summit',
  'Healthcare AI Showcase', 
  'Fintech Disruption Panel',
  'Climate Tech Accelerator',
  'Consumer Innovation Lab'
);