-- Insert sample startups with correct stage values
INSERT INTO public.startups (name, description, stage, industry, location, team_size, funding_raised, funding_goal, founded_year, website, status, contact_email, founder_names) VALUES
('TechFlow', 'AI-powered workflow automation platform', 'series-a', 'Technology', 'San Francisco, CA', 25, 2000000, 5000000, 2022, 'https://techflow.ai', 'under-review', 'founder@techflow.ai', ARRAY['Sarah Chen', 'Mark Rodriguez']),
('GreenEnergy Solutions', 'Solar panel optimization technology', 'seed', 'Clean Energy', 'Austin, TX', 12, 500000, 2000000, 2023, 'https://greenenergy.com', 'under-review', 'team@greenenergy.com', ARRAY['David Kim', 'Lisa Zhang']),
('HealthTrack Pro', 'Wearable health monitoring system', 'series-b', 'Healthcare', 'Boston, MA', 45, 8000000, 15000000, 2021, 'https://healthtrackpro.com', 'shortlisted', 'info@healthtrackpro.com', ARRAY['Jennifer Walsh', 'Michael Brown']),
('EduTech Connect', 'Virtual learning platform for K-12', 'seed', 'Education', 'Seattle, WA', 18, 750000, 3000000, 2023, 'https://edutechconnect.edu', 'under-review', 'hello@edutechconnect.edu', ARRAY['Amanda Foster', 'Ryan Cooper']),
('FinTech Innovations', 'Blockchain-based payment solutions', 'series-a', 'Financial Technology', 'New York, NY', 35, 4500000, 10000000, 2022, 'https://fintechinnovations.com', 'under-review', 'contact@fintechinnovations.com', ARRAY['Alex Thompson', 'Maria Garcia']),
('DataViz Pro', 'Business intelligence dashboard platform', 'seed', 'Technology', 'Chicago, IL', 8, 250000, 1500000, 2023, 'https://datavizpro.com', 'under-review', 'info@datavizpro.com', ARRAY['Kevin Liu', 'Sarah Adams']);

-- Insert sample sessions with correct status values
INSERT INTO public.sessions (name, description, scheduled_date, time_slot, status, category, vc_participants, completion_rate) VALUES
('Q1 2024 Evaluation Round', 'First quarter startup evaluation session focusing on early-stage tech companies', '2024-03-15', '09:00-17:00', 'completed', 'Technology', 8, 85),
('Healthcare Innovation Session', 'Specialized session for healthcare and biotech startups', '2024-03-22', '10:00-16:00', 'in-progress', 'Healthcare', 6, 67),
('Clean Energy Focus', 'Evaluation session dedicated to sustainable energy solutions', '2024-04-05', '09:30-15:30', 'scheduled', 'Clean Energy', 5, 0),
('AI & Machine Learning Round', 'Session focused on AI and ML startups', '2024-04-12', '08:00-18:00', 'scheduled', 'AI/ML', 10, 0),
('FinTech Demo Day', 'Focused session for financial technology startups', '2024-04-18', '13:00-18:00', 'scheduled', 'FinTech', 7, 0);