-- Add more evaluations with different startup/evaluator combinations
-- First let's add some pitch requests
INSERT INTO pitch_requests (startup_id, vc_id, status, request_date, calendly_link) VALUES
((SELECT id FROM startups WHERE name = 'TechFlow AI' LIMIT 1), (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1), 'scheduled', now() - interval '2 days', 'https://calendly.com/admin/techflow-pitch'),
((SELECT id FROM startups WHERE name = 'CloudScale Systems' LIMIT 1), (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1), 'completed', now() - interval '5 days', 'https://calendly.com/admin/cloudscale-pitch'),
((SELECT id FROM startups WHERE name = 'HealthTech Innovations' LIMIT 1), (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1), 'pending', now() - interval '1 day', NULL);

-- Update session stats to reflect realistic data
UPDATE sessions SET 
    vc_participants = 5,
    completion_rate = 80,
    avg_score = 7.5
WHERE name = 'Q1 Seed Round Evaluations';

UPDATE sessions SET 
    vc_participants = 4,
    completion_rate = 75,
    avg_score = 8.1
WHERE name = 'Series A Pipeline Review';

UPDATE sessions SET 
    vc_participants = 3,
    completion_rate = 90,
    avg_score = 8.4
WHERE name = 'AI/ML Focused Session';

UPDATE sessions SET 
    vc_participants = 6,
    completion_rate = 95,
    avg_score = 7.8
WHERE name = 'HealthTech Accelerator';

UPDATE sessions SET 
    vc_participants = 5,
    completion_rate = 70,
    avg_score = 7.2
WHERE name = 'Enterprise Software Demo Day';