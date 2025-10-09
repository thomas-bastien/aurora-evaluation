-- Add 'top-100-feedback' category to email_templates constraint
ALTER TABLE email_templates 
DROP CONSTRAINT IF EXISTS email_templates_category_check;

ALTER TABLE email_templates
ADD CONSTRAINT email_templates_category_check
CHECK (category IN (
  'founder_rejection',
  'founder_selection', 
  'founder_under_review',
  'juror_invitation',
  'juror_reminder',
  'pitch_scheduling',
  'assignment-notification',
  'top-100-feedback'
));

-- Insert the Top 100 Detailed VC Feedback template
INSERT INTO email_templates (
  name,
  category,
  subject_template,
  body_template,
  variables,
  lifecycle_stage,
  evaluation_phase,
  is_active
) VALUES (
  'Top 100 - Detailed VC Feedback',
  'top-100-feedback',
  '🎉 Your Aurora Tech Awards Top 100 VC Feedback',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: -0.5px;">Aurora Tech Awards</h1>
      <div style="height: 3px; width: 60px; background: rgba(255,255,255,0.3); margin: 15px auto; border-radius: 2px;"></div>
      <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px; font-weight: 500;">Excellence in Innovation</p>
    </div>
    <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
      <h1 style="color: #1e293b; margin-top: 0; margin-bottom: 24px; font-size: 28px; font-weight: 600;">Dear {{founder_name}},</h1>
      <p style="color: #475569; line-height: 1.7; font-size: 16px;">Congratulations once again on being selected for the Aurora Tech Awards Top 100! You''ve already proven yourself as one of the most promising founders in emerging markets, and we''re excited to continue supporting you on your journey.</p>
      <p style="color: #475569; line-height: 1.7; font-size: 16px;">As part of our process, we''ve partnered with leading VCs who helped us identify the founders with the highest potential to move forward. Their feedback goes beyond selection—it''s a rare opportunity to access the expertise of investors who are typically out of reach, providing valuable, actionable insights to shape your startup''s path.</p>
      <p style="color: #475569; line-height: 1.7; font-size: 16px; font-weight: 600;">Below, you''ll find detailed feedback from each VC fund. We encourage you to use these insights to build on your strengths and tackle key opportunities.</p>
      <hr style="margin: 30px 0; border: 0; border-top: 2px solid #e5e7eb;">
      {{vc_feedback_sections}}
      <hr style="margin: 30px 0; border: 0; border-top: 2px solid #e5e7eb;">
      <p style="color: #475569; line-height: 1.7; font-size: 16px;">These insights are designed to help you refine your strategy and accelerate your growth. We genuinely hope you find them valuable for your journey.</p>
      <p style="color: #475569; line-height: 1.7; font-size: 16px;">At Aurora, our mission is to make this platform as supportive as possible for female founders in emerging markets. If you have any suggestions on how we can improve or better support you, we''d love to hear from you.</p>
      <p style="color: #475569; line-height: 1.7; font-size: 16px; margin-top: 32px;">Best regards,<br><strong>The Aurora Tech Awards Team</strong></p>
    </div>
    <div style="text-align: center; padding: 24px 30px; color: #64748b; font-size: 14px;">
      <p style="margin: 0;">© 2025 Aurora Tech Awards. All rights reserved.</p>
      <div style="margin-top: 8px;">
        <span style="color: #94a3b8;">Powered by Aurora Innovation Platform</span>
      </div>
    </div>
  </div>',
  '["founder_name", "vc_feedback_sections"]'::jsonb,
  'screening',
  'results',
  true
);