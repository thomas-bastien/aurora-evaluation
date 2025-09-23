-- Insert the email templates with NULL evaluation_phase since it appears to have constraints
INSERT INTO email_templates (name, category, subject_template, body_template, variables, lifecycle_stage, is_active) VALUES
('Screening Evaluation Reminder', 'juror_reminder', '🚀 Aurora Tech Awards - Complete Your Screening Evaluations', 
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Aurora Tech Awards</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">{{round_name}} Round - Evaluation Reminder</p>
  </div>
  
  <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <h2 style="color: #333; margin-top: 0;">Hi {{juror_name}},</h2>
    
    <p style="color: #666; line-height: 1.6; font-size: 16px;">
      We hope this email finds you well! This is a friendly reminder about your pending startup evaluations in the {{round_name}} round.
    </p>
    
    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h3 style="color: #333; margin-top: 0;">Your Progress</h3>
      <p style="color: #666; margin: 5px 0;"><strong>Completion Rate:</strong> {{completion_rate}}%</p>
      <p style="color: #666; margin: 5px 0;"><strong>Remaining Evaluations:</strong> {{pending_count}}</p>
    </div>
    
    <p style="color: #666; line-height: 1.6; font-size: 16px;">
      Your expertise is crucial in identifying promising startups for the next round. Please complete your remaining evaluations at your earliest convenience.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{login_link}}" 
         style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
        Complete Evaluations Now
      </a>
    </div>
    
    <p style="color: #888; font-size: 14px; line-height: 1.5;">
      If you have any questions or need assistance, please reach out to our team. Thank you for your valuable contribution!
    </p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
    
    <p style="color: #aaa; font-size: 12px; text-align: center;">
      Aurora Tech Awards<br>
      This is an automated reminder. Please do not reply to this email.
    </p>
  </div>
</div>', 
'["juror_name", "round_name", "completion_rate", "pending_count", "login_link"]', 'general', true);