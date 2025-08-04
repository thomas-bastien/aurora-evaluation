-- First, let's check if test users already exist and create profiles if they don't have them
DO $$
DECLARE
    vc_user_id uuid;
    admin_user_id uuid;
BEGIN
    -- Try to find existing test users by email
    SELECT id INTO vc_user_id FROM auth.users WHERE email = 'vc@test.com' LIMIT 1;
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@test.com' LIMIT 1;
    
    -- Create VC profile if user exists but profile doesn't
    IF vc_user_id IS NOT NULL THEN
        INSERT INTO profiles (user_id, full_name, organization, role, expertise, investment_stages, calendly_link)
        VALUES (
            vc_user_id,
            'Test VC User',
            'Test VC Fund',
            'vc'::user_role,
            ARRAY['fintech', 'saas', 'ai'],
            ARRAY['seed', 'series-a'],
            'https://calendly.com/test-vc'
        ) ON CONFLICT (user_id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            organization = EXCLUDED.organization,
            role = EXCLUDED.role,
            expertise = EXCLUDED.expertise,
            investment_stages = EXCLUDED.investment_stages,
            calendly_link = EXCLUDED.calendly_link;
    END IF;
    
    -- Create admin profile if user exists but profile doesn't
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO profiles (user_id, full_name, organization, role, expertise, investment_stages, calendly_link)
        VALUES (
            admin_user_id,
            'Test Admin User',
            'Aurora Admin',
            'admin'::user_role,
            NULL,
            NULL,
            NULL
        ) ON CONFLICT (user_id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            organization = EXCLUDED.organization,
            role = EXCLUDED.role;
    END IF;
END $$;