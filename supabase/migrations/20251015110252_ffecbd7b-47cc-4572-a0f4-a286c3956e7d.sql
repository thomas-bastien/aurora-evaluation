-- Add AI matching metadata fields to cm_calendar_invitations
ALTER TABLE cm_calendar_invitations
ADD COLUMN IF NOT EXISTS ai_suggested_matches jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_match_confidence numeric,
ADD COLUMN IF NOT EXISTS ai_match_method text,
ADD COLUMN IF NOT EXISTS ai_match_timestamp timestamptz;

COMMENT ON COLUMN cm_calendar_invitations.ai_suggested_matches IS 'Array of Gemini AI-suggested startup/juror matches with confidence scores';
COMMENT ON COLUMN cm_calendar_invitations.ai_match_confidence IS 'Confidence score (0-100) for the top AI match';
COMMENT ON COLUMN cm_calendar_invitations.ai_match_method IS 'Gemini matching method used';
COMMENT ON COLUMN cm_calendar_invitations.ai_match_timestamp IS 'When AI matching was performed';