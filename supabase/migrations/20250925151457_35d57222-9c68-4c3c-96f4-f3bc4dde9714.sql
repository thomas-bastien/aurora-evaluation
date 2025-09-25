-- Update all email templates to professional Aurora HTML format

-- 1. Founder Rejection Template
UPDATE email_templates 
SET 
  subject_template = 'Aurora Tech Awards 2025 - Application Update',
  body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aurora Tech Awards 2025 - Application Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header with Aurora branding -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Aurora Tech Awards 2025</h1>
            <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Startup Evaluation Program</p>
        </div>
        
        <!-- Main content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Dear {{founder_name}},</h2>
            
            <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                Thank you for submitting <strong>{{startup_name}}</strong> to the Aurora Tech Awards 2025 {{round_name}} round. 
                We appreciate the time and effort you put into your application.
            </p>
            
            <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                After careful consideration by our panel of expert evaluators, we regret to inform you that 
                <strong>{{startup_name}}</strong> will not be advancing to the next stage of our program at this time.
            </p>
            
            <!-- Feedback section -->
            <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0;">
                <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">Feedback Summary</h3>
                <div style="color: #475569; line-height: 1.6; font-size: 14px;">
                    {{feedback_summary}}
                </div>
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin: 30px 0 20px 0; font-size: 16px;">
                We encourage you to continue developing your startup and consider applying to future Aurora programs. 
                The startup ecosystem is dynamic, and we believe in the importance of supporting innovative ventures at all stages.
            </p>
            
            <p style="color: #475569; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                Best of luck with your entrepreneurial journey.
            </p>
            
            <p style="color: #475569; line-height: 1.6; margin: 0; font-size: 16px;">
                Warm regards,<br>
                <strong>The Aurora Tech Awards Team</strong>
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; margin: 0; font-size: 14px;">
                © 2025 Aurora Tech Awards. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>',
  variables = '["founder_name", "startup_name", "round_name", "feedback_summary"]'::jsonb
WHERE category = 'founder_rejection';

-- 2. Founder Selection Template
UPDATE email_templates 
SET 
  subject_template = '🎉 Congratulations! {{startup_name}} Selected for Aurora Tech Awards 2025',
  body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Congratulations - Aurora Tech Awards 2025</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header with Aurora branding -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎉 Congratulations!</h1>
            <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">Aurora Tech Awards 2025</p>
        </div>
        
        <!-- Main content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Dear {{founder_name}},</h2>
            
            <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                We are thrilled to inform you that <strong style="color: #10b981;">{{startup_name}}</strong> has been 
                selected to advance to the next stage of the Aurora Tech Awards 2025!
            </p>
            
            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); border: 1px solid #bbf7d0; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
                <h3 style="color: #065f46; margin: 0 0 10px 0; font-size: 20px;">🏆 You''re Moving Forward!</h3>
                <p style="color: #047857; margin: 0; font-size: 16px;">{{startup_name}} impressed our evaluation panel</p>
            </div>
            
            <h3 style="color: #1e293b; margin: 30px 0 15px 0; font-size: 20px;">What Happens Next?</h3>
            
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 25px; margin: 20px 0;">
                <ul style="color: #475569; line-height: 1.8; margin: 0; padding-left: 20px; font-size: 16px;">
                    <li>You will receive scheduling information for the next evaluation phase</li>
                    <li>Our team will provide detailed guidance on the upcoming requirements</li>
                    <li>You''ll have access to additional resources and mentorship opportunities</li>
                </ul>
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin: 30px 0 20px 0; font-size: 16px;">
                We look forward to supporting {{startup_name}} on this exciting journey. Stay tuned for more details coming your way soon.
            </p>
            
            <!-- Call to action -->
            <div style="text-align: center; margin: 40px 0;">
                <a href="{{platform_url}}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                    Access Platform Dashboard
                </a>
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin: 0; font-size: 16px;">
                Congratulations once again!<br>
                <strong>The Aurora Tech Awards Team</strong>
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; margin: 0; font-size: 14px;">
                © 2025 Aurora Tech Awards. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>',
  variables = '["founder_name", "startup_name", "platform_url"]'::jsonb
WHERE category = 'founder_selection';

-- 3. Juror Invitation Template
UPDATE email_templates 
SET 
  subject_template = 'Invitation to Join Aurora Tech Awards 2025 as an Expert Evaluator',
  body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aurora Tech Awards 2025 - Juror Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header with Aurora branding -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Aurora Tech Awards 2025</h1>
            <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Expert Evaluator Invitation</p>
        </div>
        
        <!-- Main content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Dear {{juror_name}},</h2>
            
            <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                We are delighted to invite you to join the Aurora Tech Awards 2025 as an expert evaluator. 
                Your expertise and insights would be invaluable in identifying and supporting the next generation of innovative startups.
            </p>
            
            <!-- Highlight box -->
            <div style="background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%); border: 1px solid #bfdbfe; border-radius: 8px; padding: 25px; margin: 30px 0;">
                <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">🎯 Your Role as an Expert Evaluator</h3>
                <ul style="color: #1e40af; line-height: 1.6; margin: 0; padding-left: 20px; font-size: 14px;">
                    <li>Evaluate innovative startup applications</li>
                    <li>Provide constructive feedback to entrepreneurs</li>
                    <li>Participate in our prestigious awards program</li>
                    <li>Network with industry leaders and promising startups</li>
                </ul>
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin: 30px 0 20px 0; font-size: 16px;">
                To complete your registration and access the evaluation platform, please click the button below:
            </p>
            
            <!-- Call to action -->
            <div style="text-align: center; margin: 40px 0;">
                <a href="{{invitation_link}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                    Complete Registration
                </a>
            </div>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                    <strong>⏰ Important:</strong> This invitation expires on {{invitation_expires_at}}. 
                    Please complete your registration as soon as possible.
                </p>
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin: 30px 0 20px 0; font-size: 16px;">
                If you have any questions about the evaluation process or technical requirements, 
                please don''t hesitate to contact our team.
            </p>
            
            <p style="color: #475569; line-height: 1.6; margin: 0; font-size: 16px;">
                Thank you for your commitment to supporting innovation.<br>
                <strong>The Aurora Tech Awards Team</strong>
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; margin: 0; font-size: 14px;">
                © 2025 Aurora Tech Awards. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>',
  variables = '["juror_name", "invitation_link", "invitation_expires_at"]'::jsonb
WHERE category = 'juror_invitation';

-- 4. Juror Login Reminder Template
UPDATE email_templates 
SET 
  subject_template = 'Aurora Tech Awards - Platform Access Reminder',
  body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aurora Tech Awards - Platform Access Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header with Aurora branding -->
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Aurora Tech Awards 2025</h1>
            <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">Platform Access Reminder</p>
        </div>
        
        <!-- Main content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Hello {{juror_name}},</h2>
            
            <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                We noticed you haven''t logged into the Aurora Tech Awards evaluation platform recently. 
                Your expertise is crucial for our {{round_name}} evaluation process.
            </p>
            
            <!-- Reminder box -->
            <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 1px solid #fcd34d; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
                <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 18px;">⚡ Quick Access Needed</h3>
                <p style="color: #b45309; margin: 0; font-size: 16px;">Please log in to review your assigned evaluations</p>
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin: 30px 0 20px 0; font-size: 16px;">
                Click the button below to access the platform and continue with your evaluations:
            </p>
            
            <!-- Call to action -->
            <div style="text-align: center; margin: 40px 0;">
                <a href="{{platform_url}}" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                    Access Evaluation Platform
                </a>
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin: 30px 0 20px 0; font-size: 16px;">
                If you''re experiencing any technical difficulties or have questions about the evaluation process, 
                please reach out to our support team.
            </p>
            
            <p style="color: #475569; line-height: 1.6; margin: 0; font-size: 16px;">
                Thank you for your continued participation.<br>
                <strong>The Aurora Tech Awards Team</strong>
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; margin: 0; font-size: 14px;">
                © 2025 Aurora Tech Awards. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>',
  variables = '["juror_name", "round_name", "platform_url"]'::jsonb
WHERE category = 'juror_login_reminder';

-- 5. Juror Reminder Template
UPDATE email_templates 
SET 
  subject_template = 'Reminder: Complete Your Aurora Tech Awards Evaluations',
  body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aurora Tech Awards - Evaluation Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header with Aurora branding -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Aurora Tech Awards 2025</h1>
            <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 16px;">Evaluation Deadline Reminder</p>
        </div>
        
        <!-- Main content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Dear {{juror_name}},</h2>
            
            <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                This is a friendly reminder that you have pending evaluations for the Aurora Tech Awards 2025 {{round_name}} round.
            </p>
            
            <!-- Progress indicator -->
            <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 1px solid #fca5a5; border-radius: 8px; padding: 25px; margin: 30px 0;">
                <h3 style="color: #dc2626; margin: 0 0 15px 0; font-size: 18px;">📋 Your Evaluation Progress</h3>
                <div style="color: #7f1d1d; line-height: 1.6; font-size: 16px;">
                    <p style="margin: 0 0 10px 0;"><strong>Assigned Startups:</strong> {{assignment_count}}</p>
                    <p style="margin: 0 0 10px 0;"><strong>Completed:</strong> {{completed_count}}</p>
                    <p style="margin: 0;"><strong>Remaining:</strong> {{remaining_count}}</p>
                </div>
            </div>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                    <strong>⏰ Deadline Approaching:</strong> Please complete your remaining evaluations by {{deadline_date}}.
                </p>
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin: 30px 0 20px 0; font-size: 16px;">
                Your expert insights are essential for identifying the most promising startups. 
                Click below to access the evaluation platform:
            </p>
            
            <!-- Call to action -->
            <div style="text-align: center; margin: 40px 0;">
                <a href="{{platform_url}}" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                    Complete Evaluations
                </a>
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin: 30px 0 20px 0; font-size: 16px;">
                If you need any assistance or have questions about the evaluation criteria, 
                please don''t hesitate to contact our team.
            </p>
            
            <p style="color: #475569; line-height: 1.6; margin: 0; font-size: 16px;">
                Thank you for your valuable contribution.<br>
                <strong>The Aurora Tech Awards Team</strong>
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; margin: 0; font-size: 14px;">
                © 2025 Aurora Tech Awards. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>',
  variables = '["juror_name", "round_name", "assignment_count", "completed_count", "remaining_count", "deadline_date", "platform_url"]'::jsonb
WHERE category = 'juror_reminder';

-- 6. Pitch Scheduling Template
UPDATE email_templates 
SET 
  subject_template = 'Schedule Your Pitch Sessions - Aurora Tech Awards 2025',
  body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aurora Tech Awards - Pitch Scheduling</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header with Aurora branding -->
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Aurora Tech Awards 2025</h1>
            <p style="color: #e9d5ff; margin: 10px 0 0 0; font-size: 16px;">Pitch Session Scheduling</p>
        </div>
        
        <!-- Main content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Dear {{founder_name}},</h2>
            
            <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                Congratulations! <strong style="color: #8b5cf6;">{{startup_name}}</strong> has been selected for the pitch phase of the Aurora Tech Awards 2025. 
                Several expert evaluators are interested in scheduling pitch sessions with your team.
            </p>
            
            <!-- VCs interested section -->
            <div style="background: linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%); border-radius: 8px; padding: 25px; margin: 30px 0;">
                <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">👥 Interested Evaluators</h3>
                <div style="color: #475569; line-height: 1.8; font-size: 16px;">
                    {{vc_list}}
                </div>
            </div>
            
            <h3 style="color: #1e293b; margin: 30px 0 15px 0; font-size: 20px;">📅 How to Schedule Your Sessions</h3>
            
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 25px; margin: 20px 0;">
                <ol style="color: #475569; line-height: 1.8; margin: 0; padding-left: 20px; font-size: 16px;">
                    <li>Each evaluator will reach out to you directly with their available time slots</li>
                    <li>Sessions typically last 30-45 minutes and can be conducted virtually or in-person</li>
                    <li>Please respond promptly to scheduling requests to secure your preferred times</li>
                    <li>Prepare your pitch presentation and be ready to answer detailed questions</li>
                </ol>
            </div>
            
            <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0;">
                <h4 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px;">💡 Pitch Session Tips:</h4>
                <ul style="color: #1e40af; line-height: 1.6; margin: 0; padding-left: 20px; font-size: 14px;">
                    <li>Keep your presentation concise and impactful</li>
                    <li>Focus on your unique value proposition and market opportunity</li>
                    <li>Be prepared to discuss financials, team, and growth strategy</li>
                    <li>Practice answering tough questions about your business model</li>
                </ul>
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin: 30px 0 20px 0; font-size: 16px;">
                This is an exciting opportunity to showcase {{startup_name}} to industry experts and potential investors. 
                Make the most of these sessions!
            </p>
            
            <!-- Call to action -->
            <div style="text-align: center; margin: 40px 0;">
                <a href="{{platform_url}}" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                    Access Platform
                </a>
            </div>
            
            <p style="color: #475569; line-height: 1.6; margin: 0; font-size: 16px;">
                Best of luck with your pitch sessions!<br>
                <strong>The Aurora Tech Awards Team</strong>
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; margin: 0; font-size: 14px;">
                © 2025 Aurora Tech Awards. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>',
  variables = '["founder_name", "startup_name", "vc_list", "platform_url"]'::jsonb
WHERE category = 'pitch_scheduling';