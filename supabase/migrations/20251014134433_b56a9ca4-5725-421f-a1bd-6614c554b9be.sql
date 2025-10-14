-- Update top-100-feedback template with new celebratory copy (apostrophes escaped)
UPDATE email_templates
SET 
  body_template = '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px 20px; border-radius: 0 0 8px 8px; }
    .vc-feedback { margin: 30px 0; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">Aurora Tech Awards</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Top 100 - VC Insights & Feedback</p>
    </div>
    <div class="content">
      <p>Dear <strong>{{startup_name}}</strong>,</p>

      <p>Congratulations once again on being selected for the Aurora Tech Awards Top 100!</p>

      <p>You''ve already proven yourself as one of the most promising founders in emerging markets, and we''re excited to continue supporting you on your journey.</p>

      <p>As part of our process, we''ve partnered with leading VCs who helped us identify the founders with the highest potential to move forward. Their feedback goes beyond selection—it''s a rare opportunity to access the expertise of investors who are typically out of reach, providing valuable, actionable insights to shape your startup''s path.</p>

      <div class="vc-feedback">
        {{vc_feedback_sections}}
      </div>

      <p>Below, you''ll find detailed feedback from each VC fund. We encourage you to use these insights to build on your strengths and tackle key opportunities.</p>

      <p>These insights are designed to help you refine your strategy and accelerate your growth—we genuinely hope they provide value to your journey.</p>

      <p>At Aurora, our mission is to make this platform as valuable as possible for female founders in emerging markets. If you have any suggestions on how we can improve or better support you, we''re all ears.</p>

      <p>Best regards,<br><strong>The Aurora Tech Awards Team</strong></p>
    </div>
    <div class="footer">
      <p>© 2025 Aurora Tech Awards. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  updated_at = now()
WHERE category = 'top-100-feedback' AND is_active = true;