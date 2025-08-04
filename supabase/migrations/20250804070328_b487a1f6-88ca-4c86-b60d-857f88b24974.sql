-- Create test VC user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'vc@test.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test VC User"}',
  false,
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Create test admin user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@test.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test Admin User"}',
  false,
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Create corresponding profiles for test users
WITH test_users AS (
  SELECT id, email, raw_user_meta_data->>'full_name' as full_name
  FROM auth.users 
  WHERE email IN ('vc@test.com', 'admin@test.com')
)
INSERT INTO profiles (user_id, full_name, organization, role, expertise, investment_stages, calendly_link)
SELECT 
  tu.id,
  tu.full_name,
  CASE 
    WHEN tu.email = 'vc@test.com' THEN 'Test VC Fund'
    ELSE 'Aurora Admin'
  END,
  CASE 
    WHEN tu.email = 'vc@test.com' THEN 'vc'::user_role
    ELSE 'admin'::user_role
  END,
  CASE 
    WHEN tu.email = 'vc@test.com' THEN ARRAY['fintech', 'saas', 'ai']
    ELSE NULL
  END,
  CASE 
    WHEN tu.email = 'vc@test.com' THEN ARRAY['seed', 'series-a']
    ELSE NULL
  END,
  CASE 
    WHEN tu.email = 'vc@test.com' THEN 'https://calendly.com/test-vc'
    ELSE NULL
  END
FROM test_users tu
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  organization = EXCLUDED.organization,
  role = EXCLUDED.role,
  expertise = EXCLUDED.expertise,
  investment_stages = EXCLUDED.investment_stages,
  calendly_link = EXCLUDED.calendly_link;