-- Standardize formatting for templates #10 and #12 to match templates #1-#9

-- Template #10: Convert from dark theme to standard light theme with Aurora gradient
UPDATE email_templates 
SET body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aurora Tech Awards - New Assignments</title>
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
                                New Startup Assignments
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px; color: #2d3748; line-height: 1.6;">
                            <p style="margin: 0 0 20px 0; font-size: 16px;">Hello <strong>{{juror_name}}</strong>,</p>
                            
                            <p style="margin: 0 0 20px 0; font-size: 16px;">
                                You have been assigned <strong style="color: #667eea;">{{assignment_count}} new startup(s)</strong> for evaluation in the <strong>{{round_name}}</strong> round.
                            </p>

                            <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 8px;">
                                <h3 style="color: #667eea; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                                    📋 Your Assigned Startups
                                </h3>
                                <div style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                                    {{startup_names}}
                                </div>
                            </div>

                            <p style="margin: 20px 0; font-size: 16px;">
                                Please log into the platform to review your assignments and begin the evaluation process. Each evaluation is crucial in identifying the most promising startups for the Aurora Tech Awards.
                            </p>

                            <!-- Call to Action Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{{platform_url}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                                    Review Assignments
                                </a>
                            </div>

                            <p style="margin: 25px 0 0 0; font-size: 16px; color: #718096;">
                                If you have any questions about your assignments or the evaluation process, please don''t hesitate to reach out to our team.
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
                                This email was sent as part of the Aurora Tech Awards evaluation process.<br>
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
WHERE id = '9b5e78d2-267d-44db-bceb-8fbf7a85b602';

-- Template #12: Standardize with consistent Aurora gradient and formatting
UPDATE email_templates 
SET body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aurora Tech Awards - Pitch Scheduling</title>
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
                                Pitch Session Scheduling
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 30px; color: #2d3748; line-height: 1.6;">
                            <p style="margin: 0 0 20px 0; font-size: 16px;">Dear <strong>{{founder_name}}</strong>,</p>
                            
                            <p style="margin: 0 0 20px 0; font-size: 16px;">
                                Congratulations! <strong style="color: #667eea;">{{startup_name}}</strong> has been selected for the pitch phase of the Aurora Tech Awards. Several expert evaluators are interested in scheduling pitch sessions with your team.
                            </p>

                            <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 8px;">
                                <h3 style="color: #667eea; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                                    👥 Interested Evaluators
                                </h3>
                                <div style="color: #4a5568; font-size: 16px; line-height: 1.8;">
                                    {{vc_list}}
                                </div>
                            </div>

                            <h3 style="color: #2d3748; margin: 30px 0 15px 0; font-size: 18px; font-weight: 600;">
                                📅 How to Schedule Your Sessions
                            </h3>

                            <div style="background-color: #f7fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <ol style="color: #4a5568; line-height: 1.8; margin: 0; padding-left: 20px; font-size: 16px;">
                                    <li>Each evaluator will reach out to you directly with their available time slots</li>
                                    <li>Sessions typically last 30-45 minutes and can be conducted virtually or in-person</li>
                                    <li>Please respond promptly to scheduling requests to secure your preferred times</li>
                                    <li>Prepare your pitch presentation and be ready to answer detailed questions</li>
                                </ol>
                            </div>

                            <div style="background-color: #dbeafe; border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 8px;">
                                <h4 style="color: #667eea; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">💡 Pitch Session Tips</h4>
                                <ul style="color: #4a5568; line-height: 1.6; margin: 0; padding-left: 20px; font-size: 14px;">
                                    <li>Keep your presentation concise and impactful</li>
                                    <li>Focus on your unique value proposition and market opportunity</li>
                                    <li>Be prepared to discuss financials, team, and growth strategy</li>
                                    <li>Practice answering tough questions about your business model</li>
                                </ul>
                            </div>

                            <p style="margin: 25px 0 20px 0; font-size: 16px;">
                                This is an exciting opportunity to showcase <strong>{{startup_name}}</strong> to industry experts and potential investors. Make the most of these sessions!
                            </p>

                            <!-- Call to Action Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{{platform_url}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                                    Access Platform
                                </a>
                            </div>

                            <p style="margin: 25px 0 0 0; font-size: 16px;">
                                Best of luck with your pitch sessions!<br>
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
WHERE id = 'f7e7cf88-1eaf-4deb-a251-92bf57168b61';