-- Insert pitch scheduling template (without ON CONFLICT)
INSERT INTO email_templates (name, category, subject_template, body_template, variables, is_active)
SELECT 
  'Pitch Scheduling Invitation',
  'pitch_scheduling',
  'Schedule Your Pitch - {{startup_name}} x {{vc_name}}',
  '<div style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
    <!-- Header with Aurora branding -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: -0.5px;">Aurora Tech Awards</h1>
      <div style="height: 3px; width: 60px; background: rgba(255,255,255,0.3); margin: 15px auto; border-radius: 2px;"></div>
      <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px; font-weight: 500;">Excellence in Innovation</p>
    </div>
    
    <!-- Main content -->
    <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
      <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 24px; font-size: 24px; font-weight: 600;">Time to Schedule Your Pitch</h2>
      
      <div style="color: #475569; line-height: 1.7; font-size: 16px;">
        <p>Dear <strong>{{founder_name}}</strong>,</p>
        <p>Exciting news! <strong>{{vc_name}}</strong> is interested in learning more about <strong>{{startup_name}}</strong> and would like to schedule a pitch meeting.</p>
        
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #10b981;">
          <h3 style="color: #064e3b; margin-top: 0; font-size: 18px;">Meeting Details</h3>
          <div style="color: #065f46;">
            <p><strong>VC Partner:</strong> {{vc_name}}</p>
            <p><strong>Duration:</strong> 30 minutes</p>
            <p><strong>Format:</strong> Virtual pitch presentation</p>
          </div>
        </div>
        
        <p>Please use the calendar link below to select a time that works for your schedule. We recommend preparing a concise pitch deck and being ready to discuss your business model, traction, and funding needs.</p>
      </div>
      
      <div style="margin: 32px 0; text-align: center;">
        <a href="{{calendly_link}}" style="
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 14px 28px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          transition: all 0.3s ease;
        ">Schedule Your Pitch</a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 24px 30px; color: #64748b; font-size: 14px;">
      <p style="margin: 0;">© 2025 Aurora Tech Awards. All rights reserved.</p>
      <div style="margin-top: 8px;">
        <span style="color: #94a3b8;">Powered by Aurora Innovation Platform</span>
      </div>
    </div>
  </div>',
  '["founder_name", "startup_name", "vc_name", "calendly_link"]'::jsonb,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE category = 'pitch_scheduling'
);