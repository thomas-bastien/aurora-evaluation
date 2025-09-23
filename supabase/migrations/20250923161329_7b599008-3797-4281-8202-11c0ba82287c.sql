-- Add round and communication type tracking to email_communications table
ALTER TABLE email_communications ADD COLUMN round_name TEXT;
ALTER TABLE email_communications ADD COLUMN communication_type TEXT CHECK (communication_type IN ('selection', 'rejection', 'under-review', 'general'));

-- Add index for better query performance (only the one that doesn't exist)
CREATE INDEX idx_email_communications_round_type ON email_communications(round_name, communication_type);