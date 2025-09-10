-- Convert existing evaluation scores from 0-2 scale to 1-5 scale
-- Migration mapping: 0->1, 1->3, 2->5

-- Update screening_evaluations
UPDATE screening_evaluations SET 
  criteria_scores = (
    SELECT jsonb_object_agg(
      key,
      CASE 
        WHEN value::int = 0 THEN 1
        WHEN value::int = 1 THEN 3  
        WHEN value::int = 2 THEN 5
        ELSE GREATEST(1, LEAST(5, value::int)) -- Clamp any other values to 1-5 range
      END
    )
    FROM jsonb_each_text(criteria_scores)
    WHERE criteria_scores IS NOT NULL AND criteria_scores != '{}'::jsonb
  ),
  overall_score = CASE 
    WHEN criteria_scores IS NOT NULL AND criteria_scores != '{}'::jsonb THEN
      ROUND(
        (
          SELECT AVG(
            CASE 
              WHEN value::int = 0 THEN 1
              WHEN value::int = 1 THEN 3  
              WHEN value::int = 2 THEN 5
              ELSE GREATEST(1, LEAST(5, value::int))
            END
          ) * 2 -- Convert 1-5 average to 0-10 scale
          FROM jsonb_each_text(criteria_scores)
        ), 2
      )
    ELSE overall_score
  END
WHERE criteria_scores IS NOT NULL 
  AND criteria_scores != '{}'::jsonb
  AND status = 'submitted';

-- Update pitching_evaluations  
UPDATE pitching_evaluations SET 
  criteria_scores = (
    SELECT jsonb_object_agg(
      key,
      CASE 
        WHEN value::int = 0 THEN 1
        WHEN value::int = 1 THEN 3  
        WHEN value::int = 2 THEN 5
        ELSE GREATEST(1, LEAST(5, value::int)) -- Clamp any other values to 1-5 range
      END
    )
    FROM jsonb_each_text(criteria_scores)
    WHERE criteria_scores IS NOT NULL AND criteria_scores != '{}'::jsonb
  ),
  overall_score = CASE 
    WHEN criteria_scores IS NOT NULL AND criteria_scores != '{}'::jsonb THEN
      ROUND(
        (
          SELECT AVG(
            CASE 
              WHEN value::int = 0 THEN 1
              WHEN value::int = 1 THEN 3  
              WHEN value::int = 2 THEN 5
              ELSE GREATEST(1, LEAST(5, value::int))
            END
          ) * 2 -- Convert 1-5 average to 0-10 scale
          FROM jsonb_each_text(criteria_scores)
        ), 2
      )
    ELSE overall_score
  END
WHERE criteria_scores IS NOT NULL 
  AND criteria_scores != '{}'::jsonb
  AND status = 'submitted';

-- Add check constraints to ensure future scores are within 1-5 range
-- Note: We'll handle validation primarily in the application layer for better UX