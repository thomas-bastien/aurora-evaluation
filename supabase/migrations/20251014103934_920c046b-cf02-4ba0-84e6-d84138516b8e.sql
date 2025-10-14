-- Update all 9 email templates with exact content from user

-- Template #1: Intro Letter
UPDATE email_templates 
SET body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Aurora Tech Award</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">Backing the boldest female tech founders in emerging markets</p>
        </div>
        
        <div style="padding: 40px 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Hi {{juror_name}},</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">I''m Kseniia, and I lead everything that turns Aurora from an award into an ecosystem — from sourcing the founders, to shaping their experience, to making sure partners like you get real value out of this process.</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">This year, we''ve received {{application_count}} applications from {{country_count}} countries, and we''re excited to have you with us as we identify the five women redefining what''s possible in emerging markets.</p>
            
            <p style="margin: 0 0 10px 0; font-size: 16px; color: #333; line-height: 1.6;"><strong>What''s coming up:</strong></p>
            <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 16px; color: #333; line-height: 1.8;">
                <li><strong>December 3:</strong> Access our evaluation site to see the startups curated for your review.</li>
                <li><strong>By December 31:</strong> Submit your feedback (we promise it''s a quick process). Your scores will help us shortlist the quarter-finalists.</li>
                <li><strong>January 19 - February 2, 2026:</strong> You''ll hear the quarter-finalists most relevant to you pitch live (virtually) and help select the semi-finalists.</li>
            </ul>
            
            <p style="margin: 0 0 10px 0; font-size: 16px; color: #333; line-height: 1.6;"><strong>Your checklist</strong></p>
            <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 16px; color: #333; line-height: 1.8;">
                <li>Read the Legal Notice below before scoring.</li>
                <li>Confirm your profile and fund information are up to date.</li>
                <li>Review startup materials, you''ll receive login details and a quick video walkthrough in the next email.</li>
                <li>Submit your scores by December 31.</li>
            </ul>
            
            <p style="margin: 0 0 10px 0; font-size: 16px; color: #333; line-height: 1.6;"><strong>Why this matters:</strong></p>
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Aurora isn''t just an award, it''s a platform rebuilding the system for women founders in emerging markets: how they''re seen, how they''re funded, and how they grow.</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Every piece of feedback contributes to something bigger, the data, insights, and relationships that will open the next doors for women building the future of tech.</p>
            
            <p style="margin: 0 0 5px 0; font-size: 16px; color: #333; line-height: 1.6;">Kseniia</p>
            
            <div style="margin: 30px 0 0 0; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #667eea;">
                <p style="margin: 0 0 15px 0; font-size: 14px; color: #333; line-height: 1.6;"><strong>LEGAL NOTICE</strong></p>
                <p style="margin: 0 0 10px 0; font-size: 13px; color: #555; line-height: 1.6;">By agreeing to participate in the Aurora Tech Award (the "Award") as an External Expert and receiving any information or attachments related to this Award, you acknowledge and agree to the Award''s Terms and Conditions, Privacy Policy, and any confidentiality terms.</p>
                <p style="margin: 0; font-size: 13px; color: #555; line-height: 1.6;">This email message and its attachments are confidential, intended solely for the recipient, and may be legally privileged. Any unauthorized dissemination, copying, or other use of this communication, as well as any actions taken based on the information contained herein, are strictly prohibited.</p>
            </div>
        </div>
        
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
</html>',
variables = '["juror_name", "application_count", "country_count"]'::jsonb
WHERE id = 'ce585a87-c1ed-4fc9-a63b-cacb9abb0098';

-- Template #2: Platform Access Letter
UPDATE email_templates 
SET body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Aurora Tech Award</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">Backing the boldest female tech founders in emerging markets</p>
        </div>
        
        <div style="padding: 40px 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Hi {{juror_name}},</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">As mentioned in the last email, I''m excited to invite you to our evaluation platform, designed to make the founder scoring process as smooth and efficient as possible, whilst enabling you to share valuable, anonymous feedback with our founders.</p>
            
            <p style="margin: 0 0 10px 0; font-size: 16px; color: #333; line-height: 1.6;"><strong>Your access details:</strong></p>
            <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 16px; color: #333; line-height: 1.8;">
                <li><strong>Login:</strong> {{login_email}}</li>
                <li><strong>Password:</strong> {{temporary_password}}</li>
            </ul>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">🎥 Here''s a quick video tutorial on how to navigate the platform and submit evaluations: <a href="{{tutorial_video_link}}" style="color: #667eea; text-decoration: none;">{{tutorial_video_link}}</a></p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">If you have any questions or face any issues, please reach out to <a href="mailto:k.matveeva@indriver.com" style="color: #667eea; text-decoration: none;">k.matveeva@indriver.com</a>, we''ll be happy to help.</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Thank you again for being part of this year''s selection process. Your feedback truly helps female founders grow.</p>
            
            <p style="margin: 0 0 5px 0; font-size: 16px; color: #333; line-height: 1.6;">Best regards,<br/>Kseniia</p>
            <p style="margin: 0; font-size: 14px; color: #667eea;"><a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/" style="color: #667eea; text-decoration: none;">https://www.linkedin.com/in/kseniia-matveeva-353ab0234/</a></p>
        </div>
        
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
</html>',
variables = '["juror_name", "login_email", "temporary_password", "tutorial_video_link"]'::jsonb
WHERE id = 'e08d9fae-2f9e-471a-be45-a1d23081cd11';

-- Template #3: Follow-up 1
UPDATE email_templates 
SET body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Aurora Tech Award</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">Backing the boldest female tech founders in emerging markets</p>
        </div>
        
        <div style="padding: 40px 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Hi {{juror_name}},</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Thank you for collaborating with us on the Aurora Tech Award!</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">We still need your evaluations for the assigned projects. It won''t take much time and the process is very straightforward.</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">For a quick refresher, please check this short 1-minute tutorial video: <a href="{{tutorial_video_link}}" style="color: #667eea; text-decoration: none;">{{tutorial_video_link}}</a></p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Your feedback makes a huge difference for our founders, thank you for your time and contribution!</p>
            
            <p style="margin: 0 0 5px 0; font-size: 16px; color: #333; line-height: 1.6;">Best,<br/>Kseniia</p>
            <p style="margin: 0; font-size: 14px; color: #667eea;"><a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/" style="color: #667eea; text-decoration: none;">https://www.linkedin.com/in/kseniia-matveeva-353ab0234/</a></p>
        </div>
        
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
</html>',
variables = '["juror_name", "tutorial_video_link"]'::jsonb
WHERE id = '709b64a8-e053-412e-b8ba-fea574739716';

-- Template #4: Follow-up 2
UPDATE email_templates 
SET body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Aurora Tech Award</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">Backing the boldest female tech founders in emerging markets</p>
        </div>
        
        <div style="padding: 40px 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Hi {{juror_name}},</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">We hope you''re enjoying discovering this year''s Aurora applicants!</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">This is just a friendly reminder to complete your startup evaluations. It only takes a few minutes, and the platform is built to make it easy.</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">You can review the steps again in this 1-minute tutorial video: <a href="{{tutorial_video_link}}" style="color: #667eea; text-decoration: none;">{{tutorial_video_link}}</a></p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Your insights are deeply appreciated by the founders, your feedback helps them grow and refine their businesses.</p>
            
            <p style="margin: 0 0 5px 0; font-size: 16px; color: #333; line-height: 1.6;">Warm regards,<br/>Kseniia</p>
            <p style="margin: 0; font-size: 14px; color: #667eea;"><a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/" style="color: #667eea; text-decoration: none;">https://www.linkedin.com/in/kseniia-matveeva-353ab0234/</a></p>
        </div>
        
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
</html>',
variables = '["juror_name", "tutorial_video_link"]'::jsonb
WHERE id = '16248ecb-cd09-49ff-84a6-b7483e4cd1ac';

-- Template #5: Follow-up 3
UPDATE email_templates 
SET body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Aurora Tech Award</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">Backing the boldest female tech founders in emerging markets</p>
        </div>
        
        <div style="padding: 40px 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Hi {{juror_name}},</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">This is your final reminder to complete your startup evaluations.</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Your feedback is essential to the selection process and it only takes a few minutes to complete.</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Here''s a short 1-minute guide to help: <a href="{{tutorial_video_link}}" style="color: #667eea; text-decoration: none;">{{tutorial_video_link}}</a></p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Our participants truly value your insights, your input makes a real difference in their journey.</p>
            
            <p style="margin: 0 0 5px 0; font-size: 16px; color: #333; line-height: 1.6;">With gratitude,<br/>Kseniia</p>
            <p style="margin: 0; font-size: 14px; color: #667eea;"><a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/" style="color: #667eea; text-decoration: none;">https://www.linkedin.com/in/kseniia-matveeva-353ab0234/</a></p>
        </div>
        
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
</html>',
variables = '["juror_name", "tutorial_video_link"]'::jsonb
WHERE id = '16e2bbd5-d405-4225-819d-82e86e329cbd';

-- Template #6: Final Letter First Stage
UPDATE email_templates 
SET body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Aurora Tech Award</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">Backing the boldest female tech founders in emerging markets</p>
        </div>
        
        <div style="padding: 40px 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Hi {{juror_name}},</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Thank you so much for evaluating all assigned startups, your contribution is incredibly valuable to our participants and to the Aurora team.</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">We''ll be back in touch soon once we finalize the top 30 projects.</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">At that stage, you''ll also get a chance to review startups shortlisted by other VC partners.</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">We truly appreciate your continued support!</p>
            
            <p style="margin: 0 0 5px 0; font-size: 16px; color: #333; line-height: 1.6;">Warm regards,<br/>Kseniia</p>
            <p style="margin: 0; font-size: 14px; color: #667eea;"><a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/" style="color: #667eea; text-decoration: none;">https://www.linkedin.com/in/kseniia-matveeva-353ab0234/</a></p>
        </div>
        
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
</html>',
variables = '["juror_name"]'::jsonb
WHERE id = 'd2be47e8-1f37-430e-81ab-92f97292c7d5';

-- Template #7: Second Stage Invitation
UPDATE email_templates 
SET body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Aurora Tech Award</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">Backing the boldest female tech founders in emerging markets</p>
        </div>
        
        <div style="padding: 40px 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Hi {{juror_name}},</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Thanks to your valuable input, we''ve narrowed down the original 100 startups to the top 30 most promising companies.</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">These founders are now moving on to the next stage: live pitching sessions.</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">The startups you select during these sessions will move forward to the finalist list. Those who will fly to the UAE in April for the Aurora Tech Award ceremony.</p>
            
            <p style="margin: 0 0 10px 0; font-size: 16px; color: #333; line-height: 1.6;"><strong>Here''s what we kindly ask you to do by January 16:</strong></p>
            <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 16px; color: #333; line-height: 1.8;">
                <li>Share your Calendly (or other booking link) so founders can schedule a 15–20 minute session with you.</li>
                <li>Each pitch: 5 minutes for presentation + Q&A time.</li>
                <li>Conduct your sessions between January 19 – February 4.</li>
                <li>Submit your evaluations directly on the platform after each pitch.</li>
            </ul>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">⚠️ Please ensure all meetings are completed by February 4 so your feedback can be included in the final selection.</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Your insights are crucial. They help outstanding women founders access new opportunities and visibility to grow and scale.</p>
            
            <p style="margin: 0 0 5px 0; font-size: 16px; color: #333; line-height: 1.6;">With appreciation,<br/>Kseniia</p>
            <p style="margin: 0; font-size: 14px; color: #667eea;"><a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/" style="color: #667eea; text-decoration: none;">https://www.linkedin.com/in/kseniia-matveeva-353ab0234/</a></p>
        </div>
        
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
</html>',
variables = '["juror_name"]'::jsonb
WHERE id = 'b63505d5-492e-4423-bf41-bccf753e5337';

-- Template #8: Pitch Session Follow-up
UPDATE email_templates 
SET body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Aurora Tech Award</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">Backing the boldest female tech founders in emerging markets</p>
        </div>
        
        <div style="padding: 40px 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Hi {{juror_name}},</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Just a quick reminder to conduct your scheduled pitch sessions and submit your selection on the platform.</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Your feedback helps us ensure a fair and insightful selection process and it''s deeply appreciated by our participants.</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Thank you for staying engaged through this stage!</p>
            
            <p style="margin: 0 0 5px 0; font-size: 16px; color: #333; line-height: 1.6;">Warm regards,<br/>Kseniia</p>
            <p style="margin: 0; font-size: 14px; color: #667eea;"><a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/" style="color: #667eea; text-decoration: none;">https://www.linkedin.com/in/kseniia-matveeva-353ab0234/</a></p>
        </div>
        
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
</html>',
variables = '["juror_name"]'::jsonb
WHERE id = '5cc9f8bd-1430-455c-9272-d8429f2d3f52';

-- Template #9: Final Thank-You Letter
UPDATE email_templates 
SET body_template = '<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Aurora Tech Award</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">Backing the boldest female tech founders in emerging markets</p>
        </div>
        
        <div style="padding: 40px 30px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Hi {{juror_name}},</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Thank you for joining us on this journey and taking part in both evaluation stages.</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">Your expertise and time made a real impact on this year''s selection process.</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">We''ll soon announce the Top 15 finalists — stay tuned on our social media channels to see which founders made it to the final!</p>
            
            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333; line-height: 1.6;">We''re proud to have you as part of the Aurora community! Together, we''re building a stronger future for women-led entrepreneurship.</p>
            
            <p style="margin: 0 0 5px 0; font-size: 16px; color: #333; line-height: 1.6;">Warmest regards,<br/>Kseniia<br/>Product lead of the Aurora Tech Award</p>
            <p style="margin: 0; font-size: 14px; color: #667eea;"><a href="https://www.linkedin.com/in/kseniia-matveeva-353ab0234/" style="color: #667eea; text-decoration: none;">https://www.linkedin.com/in/kseniia-matveeva-353ab0234/</a></p>
        </div>
        
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
</html>',
variables = '["juror_name"]'::jsonb
WHERE id = '345d0a8a-61e4-49eb-9fb6-53eeb9d4dd45';