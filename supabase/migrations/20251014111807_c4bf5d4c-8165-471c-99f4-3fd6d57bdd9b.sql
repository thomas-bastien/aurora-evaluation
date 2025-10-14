-- Add display order and formatting for templates #10, #11, #12

-- Template #10: Juror Assignment Notification
UPDATE email_templates 
SET display_order = 10
WHERE id = '9b5e78d2-267d-44db-bceb-8fbf7a85b602';

-- Template #11: Top 100 - Detailed VC Feedback (upgrade to full Aurora HTML)
UPDATE email_templates 
SET 
  display_order = 11,
  body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aurora Tech Awards - Detailed VC Feedback</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                    <!-- Header with Gradient -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                🌟 Aurora Tech Awards
                            </h1>
                            <p style="color: rgba(255,255,255,0.95); margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">
                                Detailed VC Feedback
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px; color: #2d3748; line-height: 1.6;">
                            <p style="margin: 0 0 20px 0; font-size: 16px;">Dear <strong>{{startup_name}}</strong>,</p>
                            
                            <p style="margin: 0 0 20px 0; font-size: 16px;">
                                Thank you for participating in the <strong>Aurora Tech Awards</strong>. After careful review by our panel of expert VCs, we wanted to share detailed feedback on your application.
                            </p>

                            <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 8px;">
                                <h2 style="color: #667eea; margin: 0 0 15px 0; font-size: 20px; font-weight: 600;">
                                    📊 Evaluation Summary
                                </h2>
                                <p style="margin: 0; font-size: 16px; color: #4a5568;">
                                    {{vc_feedback_summary}}
                                </p>
                            </div>

                            <h3 style="color: #2d3748; margin: 30px 0 15px 0; font-size: 18px; font-weight: 600;">
                                💪 Key Strengths
                            </h3>
                            <p style="margin: 0 0 20px 0; font-size: 16px;">
                                {{strengths}}
                            </p>

                            <h3 style="color: #2d3748; margin: 30px 0 15px 0; font-size: 18px; font-weight: 600;">
                                🎯 Areas for Development
                            </h3>
                            <p style="margin: 0 0 20px 0; font-size: 16px;">
                                {{improvement_areas}}
                            </p>

                            <div style="background-color: #f7fafc; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                <p style="margin: 0; font-size: 16px; color: #4a5568;">
                                    <strong>Overall Recommendation:</strong><br>
                                    {{recommendation}}
                                </p>
                            </div>

                            <p style="margin: 25px 0 0 0; font-size: 16px;">
                                We hope this feedback helps you refine your pitch and continue building an exceptional company. Keep up the great work!
                            </p>

                            <p style="margin: 25px 0 0 0; font-size: 16px;">
                                Best regards,<br>
                                <strong style="color: #667eea;">The Aurora Tech Awards Team</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #718096;">
                                <strong>Aurora Tech Awards</strong><br>
                                Empowering Innovation, Connecting Investors
                            </p>
                            <p style="margin: 10px 0 0 0; font-size: 12px; color: #a0aec0; line-height: 1.5;">
                                This email contains confidential feedback. Please do not forward without permission.<br>
                                © 2025 Aurora Tech Awards. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'
WHERE id = '488d62bf-b731-4ccd-b248-7ed6663fef2f';

-- Template #12: Pitch Scheduling (activate and set display order)
UPDATE email_templates 
SET 
  display_order = 12,
  is_active = true
WHERE id = 'f7e7cf88-1eaf-4deb-a251-92bf57168b61';