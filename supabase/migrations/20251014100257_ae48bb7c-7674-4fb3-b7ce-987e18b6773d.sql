-- Fix display_order for juror templates to ensure #1-#9 sequential ordering
UPDATE email_templates SET display_order = 1 
WHERE id = 'ce585a87-c1ed-4fc9-a63b-cacb9abb0098';

UPDATE email_templates SET display_order = 2 
WHERE id = 'e08d9fae-2f9e-471a-be45-a1d23081cd11';

UPDATE email_templates SET display_order = 6 
WHERE id = 'd2be47e8-1f37-430e-81ab-92f97292c7d5';

-- Add missing paragraphs to Juror Pitch Session Invitation template
UPDATE email_templates
SET body_template = regexp_replace(
  body_template,
  '</ol>\s*<p>Best regards',
  E'</ol>\n\n<p>⚠️ Please ensure all meetings are completed by <strong>February 4</strong> so your feedback can be included in the final selection.</p>\n<p>Your insights are crucial. They help outstanding women founders access new opportunities and visibility to grow and scale.</p>\n\n<p>Best regards',
  'i'
)
WHERE id = 'b63505d5-492e-4423-bf41-bccf753e5337';