-- Add admin@test.com to community_managers table
INSERT INTO community_managers (
  user_id,
  name,
  email,
  organization,
  job_title,
  permissions,
  invitation_sent_at,
  invitation_expires_at
) VALUES (
  '83da5b8e-7907-4519-b6bf-11287290cf90',
  'Admin User',
  'admin@test.com',
  'Aurora Tech Awards',
  'Platform Administrator',
  '{"can_invite_cms": true, "can_manage_jurors": true, "can_manage_startups": true}'::jsonb,
  now(),
  NULL
)
ON CONFLICT (email) DO NOTHING;