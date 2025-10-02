-- Add meeting_limit column to jurors table
ALTER TABLE jurors 
ADD COLUMN meeting_limit integer;