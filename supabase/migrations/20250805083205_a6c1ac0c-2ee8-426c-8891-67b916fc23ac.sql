-- Update Thomas Bastien's role to admin so he can see all dashboard data
UPDATE public.profiles 
SET role = 'admin' 
WHERE user_id = '24887c92-06f8-460f-a52e-f9d3ed29ec13';