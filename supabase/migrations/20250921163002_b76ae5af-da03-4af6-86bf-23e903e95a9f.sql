-- Add new columns to pitching_assignments table for meeting management
ALTER TABLE public.pitching_assignments 
ADD COLUMN meeting_scheduled_date timestamp with time zone,
ADD COLUMN meeting_completed_date timestamp with time zone,
ADD COLUMN meeting_notes text,
ADD COLUMN calendly_link text;