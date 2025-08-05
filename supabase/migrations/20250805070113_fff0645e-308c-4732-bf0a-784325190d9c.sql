-- Insert sample startups
INSERT INTO public.startups (name, description, stage, industry, location, team_size, funding_raised, funding_goal, founded_year, website, status, contact_email, founder_names) VALUES
('TechFlow', 'AI-powered workflow automation platform', 'Series A', 'Technology', 'San Francisco, CA', 25, 2000000, 5000000, 2022, 'https://techflow.ai', 'under-review', 'founder@techflow.ai', ARRAY['Sarah Chen', 'Mark Rodriguez']),
('GreenEnergy Solutions', 'Solar panel optimization technology', 'Seed', 'Clean Energy', 'Austin, TX', 12, 500000, 2000000, 2023, 'https://greenenergy.com', 'under-review', 'team@greenenergy.com', ARRAY['David Kim', 'Lisa Zhang']),
('HealthTrack Pro', 'Wearable health monitoring system', 'Series B', 'Healthcare', 'Boston, MA', 45, 8000000, 15000000, 2021, 'https://healthtrackpro.com', 'shortlisted', 'info@healthtrackpro.com', ARRAY['Jennifer Walsh', 'Michael Brown']),
('EduTech Connect', 'Virtual learning platform for K-12', 'Seed', 'Education', 'Seattle, WA', 18, 750000, 3000000, 2023, 'https://edutechconnect.edu', 'under-review', 'hello@edutechconnect.edu', ARRAY['Amanda Foster', 'Ryan Cooper']);

-- Insert sample sessions
INSERT INTO public.sessions (name, description, scheduled_date, time_slot, status, category, vc_participants, completion_rate) VALUES
('Q1 2024 Evaluation Round', 'First quarter startup evaluation session focusing on early-stage tech companies', '2024-03-15', '09:00-17:00', 'completed', 'Technology', 8, 85),
('Healthcare Innovation Session', 'Specialized session for healthcare and biotech startups', '2024-03-22', '10:00-16:00', 'active', 'Healthcare', 6, 67),
('Clean Energy Focus', 'Evaluation session dedicated to sustainable energy solutions', '2024-04-05', '09:30-15:30', 'scheduled', 'Clean Energy', 5, 0),
('AI & Machine Learning Round', 'Session focused on AI and ML startups', '2024-04-12', '08:00-18:00', 'scheduled', 'AI/ML', 10, 0);

-- Insert sample evaluations with realistic scores
DO $$
DECLARE
    startup_record RECORD;
    vc_record RECORD;
    session_record RECORD;
BEGIN
    -- Get some startup and VC IDs for sample evaluations
    FOR startup_record IN SELECT id FROM public.startups LIMIT 3 LOOP
        FOR vc_record IN SELECT user_id FROM public.profiles WHERE role = 'vc' LIMIT 2 LOOP
            INSERT INTO public.evaluations (
                startup_id, 
                evaluator_id, 
                team_score, 
                product_score, 
                market_score, 
                traction_score, 
                financials_score,
                team_feedback,
                product_feedback,
                market_feedback,
                traction_feedback,
                financials_feedback,
                overall_notes,
                recommendation,
                overall_score,
                status,
                investment_amount
            ) VALUES (
                startup_record.id,
                vc_record.user_id,
                FLOOR(RANDOM() * 4) + 7, -- Random score between 7-10
                FLOOR(RANDOM() * 4) + 6, -- Random score between 6-9
                FLOOR(RANDOM() * 3) + 7, -- Random score between 7-9
                FLOOR(RANDOM() * 4) + 6, -- Random score between 6-9
                FLOOR(RANDOM() * 3) + 6, -- Random score between 6-8
                'Strong founding team with relevant experience in the industry. Good technical background.',
                'Innovative product with clear value proposition. Some concerns about scalability.',
                'Large addressable market with growing demand. Competition analysis could be stronger.',
                'Early signs of product-market fit. Revenue growth trending positively.',
                'Financial projections are realistic. Unit economics look promising.',
                'Overall positive impression. Startup shows strong potential for growth.',
                CASE WHEN RANDOM() > 0.7 THEN 'invest' WHEN RANDOM() > 0.4 THEN 'maybe' ELSE 'pass' END,
                ROUND((RANDOM() * 3 + 6.5)::numeric, 1), -- Random overall score between 6.5-9.5
                CASE WHEN RANDOM() > 0.3 THEN 'submitted' ELSE 'draft' END,
                FLOOR(RANDOM() * 500000) + 250000 -- Random investment amount
            );
        END LOOP;
    END LOOP;
END $$;