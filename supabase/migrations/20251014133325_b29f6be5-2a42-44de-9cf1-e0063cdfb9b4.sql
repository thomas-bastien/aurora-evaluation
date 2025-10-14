-- Update the top-100-feedback template to use the correct structure
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
      <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">VC Evaluation Feedback</p>
    </div>
    <div class="content">
      <p>Dear <strong>{{startup_name}}</strong>,</p>

      <p>Thank you for participating in the Aurora Tech Awards. After careful review by our panel of expert VCs, we wanted to share detailed feedback on your application.</p>

      <div class="vc-feedback">
        {{vc_feedback_sections}}
      </div>

      <p>We hope this feedback helps you refine your pitch and continue building an exceptional company. Keep up the great work!</p>

      <p>Best regards,<br><strong>The Aurora Tech Awards Team</strong></p>
    </div>
    <div class="footer">
      <p>© 2025 Aurora Tech Awards. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  variables = '["startup_name", "vc_feedback_sections"]'::jsonb,
  updated_at = now()
WHERE category = 'top-100-feedback' AND is_active = true;