-- Add invitation_token to jurors table for signup links
ALTER TABLE public.jurors 
ADD COLUMN invitation_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN invitation_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN invitation_expires_at TIMESTAMP WITH TIME ZONE;