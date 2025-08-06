-- First, let's add some evaluations using your existing user ID
-- Get your current user ID and create evaluations for the existing startups
INSERT INTO evaluations (
    evaluator_id, startup_id, status,
    team_score, product_score, market_score, traction_score, financials_score,
    team_feedback, product_feedback, market_feedback, traction_feedback, financials_feedback,
    overall_score, overall_notes, recommendation, investment_amount
) VALUES
-- Your evaluations as admin/vc
((SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1), (SELECT id FROM startups WHERE name = 'TechFlow AI' LIMIT 1), 'submitted',
 9, 8, 9, 7, 8,
 'Exceptional founding team with strong technical background and previous exits.',
 'Product shows strong technical innovation with clear competitive advantages.',
 'Large addressable market with growing demand for AI automation solutions.',
 'Early traction is promising but needs more enterprise customers.',
 'Revenue model is solid, burn rate manageable for 18 months runway.',
 8.2, 'Strong investment opportunity with experienced team and innovative product.', 'strong_yes', 2000000),

((SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1), (SELECT id FROM startups WHERE name = 'GreenEnergy Solutions' LIMIT 1), 'submitted',
 7, 8, 9, 6, 7,
 'Good team but lacks domain expertise in energy sector.',
 'Solid technology but competitive landscape is challenging.',
 'Huge market opportunity driven by climate regulations.',
 'Limited customer validation, mostly pilot programs.',
 'Need significant capital for manufacturing scale.',
 7.4, 'Interesting opportunity but execution risks are high.', 'maybe', 1500000),

((SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1), (SELECT id FROM startups WHERE name = 'HealthTech Innovations' LIMIT 1), 'submitted',
 8, 9, 8, 8, 7,
 'Strong healthcare background, regulatory experience valuable.',
 'Innovative approach to patient monitoring with FDA pathway clear.',
 'Healthcare IT market growing rapidly, good timing.',
 'Strong pilot results with major hospital systems.',
 'Revenue projections aggressive but achievable.',
 8.0, 'Compelling healthcare opportunity with strong execution.', 'yes', 3000000),

((SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1), (SELECT id FROM startups WHERE name = 'FinanceFlow Pro' LIMIT 1), 'submitted',
 6, 7, 7, 5, 6,
 'Team lacks fintech experience, learning curve steep.',
 'Product has potential but user experience needs work.',
 'Competitive market with established players.',
 'Customer acquisition costs too high currently.',
 'Burn rate concerning, need to improve unit economics.',
 6.2, 'Needs significant improvements before investment ready.', 'no', 0),

((SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1), (SELECT id FROM startups WHERE name = 'CloudScale Systems' LIMIT 1), 'submitted',
 9, 9, 8, 9, 8,
 'World-class engineering team from top tech companies.',
 'Technical solution is genuinely innovative and defensible.',
 'Enterprise cloud market has massive growth potential.',
 'Impressive early customer wins including Fortune 500.',
 'Strong financial metrics with path to profitability.',
 8.6, 'Exceptional opportunity with best-in-class execution.', 'strong_yes', 5000000),

((SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1), (SELECT id FROM startups WHERE name = 'RetailRevolution' LIMIT 1), 'submitted',
 7, 6, 6, 4, 5,
 'Retail experience helpful but team needs strengthening.',
 'Product concept interesting but execution challenging.',
 'Retail tech market declining, COVID impact permanent.',
 'Customer retention metrics below industry average.',
 'Cash flow negative with unclear path to profitability.',
 5.6, 'Market headwinds too strong, timing not right.', 'no', 0);

-- Add some pitch requests
INSERT INTO pitch_requests (startup_id, vc_id, status, request_date, calendly_link) VALUES
((SELECT id FROM startups WHERE name = 'TechFlow AI' LIMIT 1), (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1), 'scheduled', now() - interval '2 days', 'https://calendly.com/admin/techflow-pitch'),
((SELECT id FROM startups WHERE name = 'CloudScale Systems' LIMIT 1), (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1), 'completed', now() - interval '5 days', 'https://calendly.com/admin/cloudscale-pitch'),
((SELECT id FROM startups WHERE name = 'HealthTech Innovations' LIMIT 1), (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1), 'pending', now() - interval '1 day', NULL);

-- Update session stats to reflect the new data
UPDATE sessions SET 
    vc_participants = 3,
    completion_rate = 85,
    avg_score = 7.2
WHERE name = 'Q1 Seed Round Evaluations';

UPDATE sessions SET 
    vc_participants = 4,
    completion_rate = 75,
    avg_score = 8.1
WHERE name = 'Series A Pipeline Review';

UPDATE sessions SET 
    vc_participants = 2,
    completion_rate = 90,
    avg_score = 8.4
WHERE name = 'AI/ML Focused Session';