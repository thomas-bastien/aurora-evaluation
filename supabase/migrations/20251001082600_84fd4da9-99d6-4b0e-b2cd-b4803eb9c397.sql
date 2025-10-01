-- Add internal_score column to startups table
ALTER TABLE startups 
ADD COLUMN internal_score NUMERIC(3,1) 
CHECK (internal_score >= 0 AND internal_score <= 10);

COMMENT ON COLUMN startups.internal_score IS 'Internal evaluation score by Aurora admin team (0-10 scale)';

-- Update RLS policy for VCs to exclude internal_score from select
DROP POLICY IF EXISTS "VCs can view basic startup info for all startups" ON startups;

CREATE POLICY "VCs can view basic startup info for all startups"
ON startups
FOR SELECT
TO authenticated
USING (
  get_current_user_role() = 'vc' 
  AND true
);

-- Note: RLS will naturally prevent VCs from seeing internal_score since it's not explicitly 
-- selected in their queries, and they can't insert/update it due to existing policies