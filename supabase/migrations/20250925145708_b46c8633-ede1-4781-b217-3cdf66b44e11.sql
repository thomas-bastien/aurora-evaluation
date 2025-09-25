UPDATE email_templates 
SET 
  body_template = '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Startup Assignments - {{roundName}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #1E293B;">
        <!-- Header with Aurora gradient -->
        <div style="background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #FFFFFF; font-size: 28px; font-weight: bold; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                Aurora Tech Awards
            </h1>
            <p style="color: #E2E8F0; font-size: 16px; margin: 8px 0 0 0; opacity: 0.9;">
                New Startup Assignments
            </p>
        </div>
        
        <!-- Main content -->
        <div style="padding: 40px 30px; color: #E2E8F0;">
            <h2 style="color: #FFFFFF; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">
                Hello {{juror_name}},
            </h2>
            
            <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                You have been assigned <strong style="color: #60A5FA;">{{assignment_count}} new startup(s)</strong> for evaluation in the <strong style="color: #A78BFA;">{{round_name}}</strong> round.
            </p>
            
            <div style="background-color: #334155; border-left: 4px solid #3B82F6; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <h3 style="color: #60A5FA; font-size: 18px; font-weight: 600; margin: 0 0 10px 0;">
                    Your Assigned Startups:
                </h3>
                <div style="color: #CBD5E1; font-size: 16px; line-height: 1.5;">
                    {{startup_names}}
                </div>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6; margin: 20px 0;">
                Please log into the platform to review your assignments and begin the evaluation process. Each evaluation is crucial in identifying the most promising startups for the Aurora Tech Awards.
            </p>
            
            <!-- Call to action button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{platform_url}}" style="display: inline-block; background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: #FFFFFF; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); transition: transform 0.2s;">
                    Review Assignments
                </a>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; color: #94A3B8;">
                If you have any questions about your assignments or the evaluation process, please don''t hesitate to reach out to our team.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #0F172A; padding: 30px; text-align: center; border-top: 1px solid #334155;">
            <p style="color: #64748B; font-size: 14px; margin: 0 0 10px 0;">
                Best regards,<br>
                <strong style="color: #94A3B8;">The Aurora Team</strong>
            </p>
            <p style="color: #475569; font-size: 12px; margin: 0;">
                This email was sent as part of the Aurora Tech Awards evaluation process.
            </p>
        </div>
    </div>
</body>
</html>',
  variables = '["juror_name", "round_name", "assignment_count", "startup_names", "platform_url"]'::jsonb,
  updated_at = now()
WHERE name = 'Juror Assignment Notification';