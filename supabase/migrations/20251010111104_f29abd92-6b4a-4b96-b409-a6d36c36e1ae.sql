-- Create table for storing VC feedback details (plain text format)
CREATE TABLE public.startup_vc_feedback_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid REFERENCES public.startups(id) ON DELETE CASCADE NOT NULL,
  round_name text NOT NULL CHECK (round_name IN ('screening', 'pitching')),
  
  -- Plain text formatted VC feedback
  plain_text_feedback text NOT NULL,
  
  -- Tracking metadata
  evaluation_count integer NOT NULL,
  is_approved boolean DEFAULT false,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamp with time zone,
  
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  
  UNIQUE(startup_id, round_name)
);

-- Enable RLS
ALTER TABLE public.startup_vc_feedback_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all VC feedback details"
  ON public.startup_vc_feedback_details
  FOR ALL
  USING (get_current_user_role() = 'admin');

CREATE POLICY "CMs can manage all VC feedback details"
  ON public.startup_vc_feedback_details
  FOR ALL
  USING (get_current_user_role() = 'cm');

-- Indexes for performance
CREATE INDEX idx_vc_feedback_startup ON public.startup_vc_feedback_details(startup_id, round_name);
CREATE INDEX idx_vc_feedback_approval ON public.startup_vc_feedback_details(is_approved);

-- Trigger for updated_at
CREATE TRIGGER update_vc_feedback_details_updated_at
  BEFORE UPDATE ON public.startup_vc_feedback_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Cache invalidation function for when new evaluations are submitted
CREATE OR REPLACE FUNCTION public.invalidate_vc_feedback_details_cache()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'submitted') OR
     (TG_OP = 'UPDATE' AND OLD.status != 'submitted' AND NEW.status = 'submitted') OR
     (TG_OP = 'DELETE') THEN
    
    IF TG_TABLE_NAME = 'screening_evaluations' THEN
      DELETE FROM public.startup_vc_feedback_details 
      WHERE startup_id = COALESCE(NEW.startup_id, OLD.startup_id) AND round_name = 'screening';
    ELSIF TG_TABLE_NAME = 'pitching_evaluations' THEN
      DELETE FROM public.startup_vc_feedback_details 
      WHERE startup_id = COALESCE(NEW.startup_id, OLD.startup_id) AND round_name = 'pitching';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers on evaluation tables
CREATE TRIGGER screening_vc_feedback_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON public.screening_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.invalidate_vc_feedback_details_cache();

CREATE TRIGGER pitching_vc_feedback_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON public.pitching_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.invalidate_vc_feedback_details_cache();