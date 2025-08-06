-- Insert sample VC profiles
INSERT INTO profiles (user_id, full_name, organization, role, expertise, investment_stages, calendly_link) VALUES
('11111111-1111-1111-1111-111111111111', 'Sarah Chen', 'Accel Partners', 'vc', ARRAY['fintech', 'enterprise'], ARRAY['seed', 'series-a'], 'https://calendly.com/sarah-chen'),
('22222222-2222-2222-2222-222222222222', 'Michael Rodriguez', 'Andreessen Horowitz', 'vc', ARRAY['consumer', 'marketplace'], ARRAY['series-a', 'series-b'], 'https://calendly.com/michael-rodriguez'),
('33333333-3333-3333-3333-333333333333', 'Emma Thompson', 'Sequoia Capital', 'vc', ARRAY['healthcare', 'biotech'], ARRAY['seed', 'series-a'], 'https://calendly.com/emma-thompson'),
('44444444-4444-4444-4444-444444444444', 'David Kim', 'Benchmark Capital', 'vc', ARRAY['enterprise', 'devtools'], ARRAY['seed', 'series-a', 'series-b'], 'https://calendly.com/david-kim'),
('55555555-5555-5555-5555-555555555555', 'Lisa Wang', 'GV (Google Ventures)', 'vc', ARRAY['ai', 'machine-learning'], ARRAY['series-a', 'series-b'], 'https://calendly.com/lisa-wang');

-- Insert sample evaluations linking VCs to startups
INSERT INTO evaluations (
    evaluator_id, startup_id, status,
    team_score, product_score, market_score, traction_score, financials_score,
    team_feedback, product_feedback, market_feedback, traction_feedback, financials_feedback,
    overall_score, overall_notes, recommendation, investment_amount
) VALUES
-- Sarah Chen evaluations
('11111111-1111-1111-1111-111111111111', (SELECT id FROM startups WHERE name = 'TechFlow AI' LIMIT 1), 'submitted',
 9, 8, 9, 7, 8,
 'Exceptional founding team with strong technical background and previous exits.',
 'Product shows strong technical innovation with clear competitive advantages.',
 'Large addressable market with growing demand for AI automation solutions.',
 'Early traction is promising but needs more enterprise customers.',
 'Revenue model is solid, burn rate manageable for 18 months runway.',
 8.2, 'Strong investment opportunity with experienced team and innovative product.', 'strong_yes', 2000000),

('11111111-1111-1111-1111-111111111111', (SELECT id FROM startups WHERE name = 'GreenEnergy Solutions' LIMIT 1), 'submitted',
 7, 8, 9, 6, 7,
 'Good team but lacks domain expertise in energy sector.',
 'Solid technology but competitive landscape is challenging.',
 'Huge market opportunity driven by climate regulations.',
 'Limited customer validation, mostly pilot programs.',
 'Need significant capital for manufacturing scale.',
 7.4, 'Interesting opportunity but execution risks are high.', 'maybe', 1500000),

-- Michael Rodriguez evaluations  
('22222222-2222-2222-2222-222222222222', (SELECT id FROM startups WHERE name = 'HealthTech Innovations' LIMIT 1), 'submitted',
 8, 9, 8, 8, 7,
 'Strong healthcare background, regulatory experience valuable.',
 'Innovative approach to patient monitoring with FDA pathway clear.',
 'Healthcare IT market growing rapidly, good timing.',
 'Strong pilot results with major hospital systems.',
 'Revenue projections aggressive but achievable.',
 8.0, 'Compelling healthcare opportunity with strong execution.', 'yes', 3000000),

('22222222-2222-2222-2222-222222222222', (SELECT id FROM startups WHERE name = 'FinanceFlow Pro' LIMIT 1), 'submitted',
 6, 7, 7, 5, 6,
 'Team lacks fintech experience, learning curve steep.',
 'Product has potential but user experience needs work.',
 'Competitive market with established players.',
 'Customer acquisition costs too high currently.',
 'Burn rate concerning, need to improve unit economics.',
 6.2, 'Needs significant improvements before investment ready.', 'no', 0),

-- Emma Thompson evaluations
('33333333-3333-3333-3333-333333333333', (SELECT id FROM startups WHERE name = 'CloudScale Systems' LIMIT 1), 'submitted',
 9, 9, 8, 9, 8,
 'World-class engineering team from top tech companies.',
 'Technical solution is genuinely innovative and defensible.',
 'Enterprise cloud market has massive growth potential.',
 'Impressive early customer wins including Fortune 500.',
 'Strong financial metrics with path to profitability.',
 8.6, 'Exceptional opportunity with best-in-class execution.', 'strong_yes', 5000000),

('33333333-3333-3333-3333-333333333333', (SELECT id FROM startups WHERE name = 'RetailRevolution' LIMIT 1), 'submitted',
 7, 6, 6, 4, 5,
 'Retail experience helpful but team needs strengthening.',
 'Product concept interesting but execution challenging.',
 'Retail tech market declining, COVID impact permanent.',
 'Customer retention metrics below industry average.',
 'Cash flow negative with unclear path to profitability.',
 5.6, 'Market headwinds too strong, timing not right.', 'no', 0),

-- David Kim evaluations (some in progress)
('44444444-4444-4444-4444-444444444444', (SELECT id FROM startups WHERE name = 'TechFlow AI' LIMIT 1), 'draft',
 8, 8, 8, 7, 7,
 'Strong technical team with good product vision.',
 'Solid MVP but needs more enterprise features.',
 'Large market but competition increasing.',
 'Good early metrics but need more data.',
 'Financial projections seem reasonable.',
 7.6, 'Promising startup, need to complete due diligence.', 'maybe', 1800000),

-- Lisa Wang evaluations
('55555555-5555-5555-5555-555555555555', (SELECT id FROM startups WHERE name = 'HealthTech Innovations' LIMIT 1), 'submitted',
 8, 9, 9, 8, 8,
 'Healthcare AI expertise is exactly what market needs.',
 'AI algorithms show significant improvement over existing solutions.',
 'Healthcare AI market projected to grow 40% annually.',
 'Clinical trials showing promising efficacy results.',
 'Revenue model scales well with AI capabilities.',
 8.4, 'Perfect fit for AI-focused investment thesis.', 'strong_yes', 4000000);

-- Insert VC session assignments
INSERT INTO vc_sessions (vc_id, session_id, status) VALUES
('11111111-1111-1111-1111-111111111111', (SELECT id FROM sessions WHERE name = 'Q1 Seed Round Evaluations' LIMIT 1), 'active'),
('22222222-2222-2222-2222-222222222222', (SELECT id FROM sessions WHERE name = 'Q1 Seed Round Evaluations' LIMIT 1), 'active'),
('33333333-3333-3333-3333-333333333333', (SELECT id FROM sessions WHERE name = 'Series A Pipeline Review' LIMIT 1), 'active'),
('44444444-4444-4444-4444-444444444444', (SELECT id FROM sessions WHERE name = 'Series A Pipeline Review' LIMIT 1), 'active'),
('55555555-5555-5555-5555-555555555555', (SELECT id FROM sessions WHERE name = 'AI/ML Focused Session' LIMIT 1), 'active'),
('11111111-1111-1111-1111-111111111111', (SELECT id FROM sessions WHERE name = 'HealthTech Accelerator' LIMIT 1), 'completed'),
('22222222-2222-2222-2222-222222222222', (SELECT id FROM sessions WHERE name = 'Enterprise Software Demo Day' LIMIT 1), 'assigned');

-- Insert some pitch requests
INSERT INTO pitch_requests (startup_id, vc_id, status, request_date, calendly_link) VALUES
((SELECT id FROM startups WHERE name = 'TechFlow AI' LIMIT 1), '11111111-1111-1111-1111-111111111111', 'scheduled', now() - interval '2 days', 'https://calendly.com/sarah-chen/techflow-pitch'),
((SELECT id FROM startups WHERE name = 'CloudScale Systems' LIMIT 1), '33333333-3333-3333-3333-333333333333', 'completed', now() - interval '5 days', 'https://calendly.com/emma-thompson/cloudscale-pitch'),
((SELECT id FROM startups WHERE name = 'HealthTech Innovations' LIMIT 1), '22222222-2222-2222-2222-222222222222', 'pending', now() - interval '1 day', NULL),
((SELECT id FROM startups WHERE name = 'HealthTech Innovations' LIMIT 1), '55555555-5555-5555-5555-555555555555', 'scheduled', now() - interval '3 days', 'https://calendly.com/lisa-wang/healthtech-pitch');