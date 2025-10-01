-- Add evaluation_limit column to jurors table
ALTER TABLE public.jurors 
ADD COLUMN evaluation_limit integer NULL;

COMMENT ON COLUMN public.jurors.evaluation_limit IS 
'Maximum number of evaluations this juror can be assigned per round. NULL = use dynamic calculation based on (total_startups × 3) / total_jurors';