-- First add unique constraint on jurors.user_id
ALTER TABLE jurors
ADD CONSTRAINT jurors_user_id_unique UNIQUE (user_id);

-- Now add foreign key from screening_evaluations to jurors
ALTER TABLE screening_evaluations
ADD CONSTRAINT screening_evaluations_evaluator_id_fkey 
FOREIGN KEY (evaluator_id) 
REFERENCES jurors(user_id)
ON DELETE CASCADE;

-- Add foreign key from pitching_evaluations to jurors  
ALTER TABLE pitching_evaluations
ADD CONSTRAINT pitching_evaluations_evaluator_id_fkey
FOREIGN KEY (evaluator_id)
REFERENCES jurors(user_id)
ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_screening_evaluations_evaluator_id 
ON screening_evaluations(evaluator_id);

CREATE INDEX IF NOT EXISTS idx_pitching_evaluations_evaluator_id
ON pitching_evaluations(evaluator_id);