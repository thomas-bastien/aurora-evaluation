-- Restore missing content and apply full HTML Aurora branding to templates #3, #4, #5, #8, #9

-- Template #3: Juror First Evaluation Reminder - Add full content and HTML structure
UPDATE email_templates
SET body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Aurora Gradient Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                Aurora Tech Award
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">
                Backing the boldest female tech founders in emerging markets
            </p>
        </div>
        
        <!-- Content Body -->
        <div style="padding: 40px 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Dear {{juror_name}},</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                We hope you''re enjoying discovering our participants. We are getting closer to having all our juries evaluated and wanted to remind you to submit your evaluations for the applications you were assigned.
            </p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                The process is straightforward and won''t take much of your time. If you need a quick refresher, check out our <a href="{{tutorial_video_link}}" style="color: #667eea; text-decoration: underline;">1-minute tutorial video</a>.
            </p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                Thank you for collaborating with us in making the selection of the top 30 participants. Your expertise is truly appreciated!
            </p>
            
            <p style="margin: 20px 0 0 0; font-size: 16px; color: #333; line-height: 1.6;">Best regards,</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; color: #333; line-height: 1.6;"><strong>Nina Segura</strong><br/>
            Programme Manager, Aurora Tech Award<br/>
            <a href="https://www.linkedin.com/in/ninasegura/" style="color: #667eea; text-decoration: underline;">LinkedIn Profile</a></p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0 0 15px 0; font-size: 12px; color: #6c757d; line-height: 1.6;">
                <strong>LEGAL NOTICE:</strong><br/>
                By participating in the Aurora Tech Award as an External Expert, you acknowledge and agree to the Award''s Terms and Conditions, Privacy Policy, and confidentiality terms. This message and attachments are confidential and intended solely for the recipient.
            </p>
            <p style="margin: 15px 0 0 0; font-size: 12px; color: #6c757d;">
                © 2025 Aurora Tech Award. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>'
WHERE id = '709b64a8-e053-412e-b8ba-fea574739716';

-- Template #4: Juror Second Evaluation Reminder - Add full content and HTML structure
UPDATE email_templates
SET body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Aurora Gradient Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                Aurora Tech Award
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">
                Backing the boldest female tech founders in emerging markets
            </p>
        </div>
        
        <!-- Content Body -->
        <div style="padding: 40px 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Dear {{juror_name}},</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                We hope you''re enjoying discovering our applicants. This is just a friendly reminder to complete your startup evaluations if you haven''t already!
            </p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                The process only takes a few minutes, and if you need a quick guide, you can always check out our <a href="{{tutorial_video_link}}" style="color: #667eea; text-decoration: underline;">short tutorial</a>.
            </p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                Your insights are so valuable to the founders, and they truly appreciate your thoughtful feedback!
            </p>
            
            <p style="margin: 20px 0 0 0; font-size: 16px; color: #333; line-height: 1.6;">Best regards,</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; color: #333; line-height: 1.6;"><strong>Nina Segura</strong><br/>
            Programme Manager, Aurora Tech Award<br/>
            <a href="https://www.linkedin.com/in/ninasegura/" style="color: #667eea; text-decoration: underline;">LinkedIn Profile</a></p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0 0 15px 0; font-size: 12px; color: #6c757d; line-height: 1.6;">
                <strong>LEGAL NOTICE:</strong><br/>
                By participating in the Aurora Tech Award as an External Expert, you acknowledge and agree to the Award''s Terms and Conditions, Privacy Policy, and confidentiality terms. This message and attachments are confidential and intended solely for the recipient.
            </p>
            <p style="margin: 15px 0 0 0; font-size: 12px; color: #6c757d;">
                © 2025 Aurora Tech Award. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>'
WHERE id = '16248ecb-cd09-49ff-84a6-b7483e4cd1ac';

-- Template #5: Juror Final Evaluation Reminder - Add full content and HTML structure
UPDATE email_templates
SET body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Aurora Gradient Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                Aurora Tech Award
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">
                Backing the boldest female tech founders in emerging markets
            </p>
        </div>
        
        <!-- Content Body -->
        <div style="padding: 40px 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Dear {{juror_name}},</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                This is our final reminder to submit your startup evaluations. Your feedback is essential to our selection process, and we truly value your time and expertise.
            </p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                The evaluation should only take a few minutes, and if you need a guide, feel free to check out our <a href="{{tutorial_video_link}}" style="color: #667eea; text-decoration: underline;">quick tutorial</a>.
            </p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                Please remember that the participants truly value your insights and are looking forward to receiving your feedback!
            </p>
            
            <p style="margin: 20px 0 0 0; font-size: 16px; color: #333; line-height: 1.6;">With gratitude,</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; color: #333; line-height: 1.6;"><strong>Nina Segura</strong><br/>
            Programme Manager, Aurora Tech Award<br/>
            <a href="https://www.linkedin.com/in/ninasegura/" style="color: #667eea; text-decoration: underline;">LinkedIn Profile</a></p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0 0 15px 0; font-size: 12px; color: #6c757d; line-height: 1.6;">
                <strong>LEGAL NOTICE:</strong><br/>
                By participating in the Aurora Tech Award as an External Expert, you acknowledge and agree to the Award''s Terms and Conditions, Privacy Policy, and confidentiality terms. This message and attachments are confidential and intended solely for the recipient.
            </p>
            <p style="margin: 15px 0 0 0; font-size: 12px; color: #6c757d;">
                © 2025 Aurora Tech Award. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>'
WHERE id = '16e2bbd5-d405-4225-819d-82e86e329cbd';

-- Template #8: Juror Pitch Session Reminder - Add full content and HTML structure
UPDATE email_templates
SET body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Aurora Gradient Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                Aurora Tech Award
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">
                Backing the boldest female tech founders in emerging markets
            </p>
        </div>
        
        <!-- Content Body -->
        <div style="padding: 40px 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Dear {{juror_name}},</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                This is a quick reminder to hold your pitch sessions with the participants you selected and submit your selection on the platform.
            </p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                Your collaboration is essential to ensuring a fair and insightful selection process. Your engagement and expertise are deeply appreciated by the participants!
            </p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                Thank you for staying engaged through this stage.
            </p>
            
            <p style="margin: 20px 0 0 0; font-size: 16px; color: #333; line-height: 1.6;">Best regards,</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; color: #333; line-height: 1.6;"><strong>Nina Segura</strong><br/>
            Programme Manager, Aurora Tech Award<br/>
            <a href="https://www.linkedin.com/in/ninasegura/" style="color: #667eea; text-decoration: underline;">LinkedIn Profile</a></p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0 0 15px 0; font-size: 12px; color: #6c757d; line-height: 1.6;">
                <strong>LEGAL NOTICE:</strong><br/>
                By participating in the Aurora Tech Award as an External Expert, you acknowledge and agree to the Award''s Terms and Conditions, Privacy Policy, and confidentiality terms. This message and attachments are confidential and intended solely for the recipient.
            </p>
            <p style="margin: 15px 0 0 0; font-size: 12px; color: #6c757d;">
                © 2025 Aurora Tech Award. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>'
WHERE id = '5cc9f8bd-1430-455c-9272-d8429f2d3f52';

-- Template #9: Juror Final Thank You - Add full content and HTML structure
UPDATE email_templates
SET body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Aurora Gradient Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">
                Aurora Tech Award
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">
                Backing the boldest female tech founders in emerging markets
            </p>
        </div>
        
        <!-- Content Body -->
        <div style="padding: 40px 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Dear {{juror_name}},</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                Thank you for joining us on this journey as part of the Aurora Tech Award. Your involvement in both the evaluation stage and the pitch sessions has made a real impact. We couldn''t do this without experts like you!
            </p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                Soon, we''ll be announcing the top 15 finalists who will move forward in the programme. Stay tuned for the big reveal!
            </p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                Keep up with all the latest updates by following us on <a href="https://www.linkedin.com/company/auroratechaward" style="color: #667eea; text-decoration: underline;">LinkedIn</a>, <a href="https://www.instagram.com/auroratechaward" style="color: #667eea; text-decoration: underline;">Instagram</a>, and <a href="https://twitter.com/auroratechaward" style="color: #667eea; text-decoration: underline;">X</a>.
            </p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">
                Thank you again for being part of the Aurora community. Together, we''re building a stronger future for women-led entrepreneurship in emerging markets.
            </p>
            
            <p style="margin: 20px 0 0 0; font-size: 16px; color: #333; line-height: 1.6;">Best regards,</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; color: #333; line-height: 1.6;"><strong>Nina Segura</strong><br/>
            Programme Manager, Aurora Tech Award<br/>
            <a href="https://www.linkedin.com/in/ninasegura/" style="color: #667eea; text-decoration: underline;">LinkedIn Profile</a></p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="margin: 0 0 15px 0; font-size: 12px; color: #6c757d; line-height: 1.6;">
                <strong>LEGAL NOTICE:</strong><br/>
                By participating in the Aurora Tech Award as an External Expert, you acknowledge and agree to the Award''s Terms and Conditions, Privacy Policy, and confidentiality terms. This message and attachments are confidential and intended solely for the recipient.
            </p>
            <p style="margin: 15px 0 0 0; font-size: 12px; color: #6c757d;">
                © 2025 Aurora Tech Award. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>'
WHERE id = '345d0a8a-61e4-49eb-9fb6-53eeb9d4dd45';