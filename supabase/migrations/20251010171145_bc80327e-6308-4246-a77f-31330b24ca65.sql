-- Create VC feedback enhancement cache table for Phase 3
CREATE TABLE IF NOT EXISTS public.vc_feedback_enhancement_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid REFERENCES public.startups(id) ON DELETE CASCADE,
  round_name text NOT NULL,
  input_hash text NOT NULL,
  enhanced_text text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_enhancement_cache UNIQUE(startup_id, round_name, input_hash)
);

-- Enable RLS
ALTER TABLE public.vc_feedback_enhancement_cache ENABLE ROW LEVEL SECURITY;

-- Allow admins and CMs to manage cache
CREATE POLICY "Admins can manage enhancement cache"
  ON public.vc_feedback_enhancement_cache
  FOR ALL
  USING (get_current_user_role() = ANY(ARRAY['admin'::text, 'cm'::text]));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_enhancement_cache_lookup 
  ON public.vc_feedback_enhancement_cache(startup_id, round_name, input_hash);

-- Create index for cleanup of old entries
CREATE INDEX IF NOT EXISTS idx_enhancement_cache_created 
  ON public.vc_feedback_enhancement_cache(created_at);

COMMENT ON TABLE public.vc_feedback_enhancement_cache IS 'Caches AI-enhanced VC feedback to improve performance and reduce API calls';