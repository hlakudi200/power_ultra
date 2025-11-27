-- Add instructor_id column to schedule table
ALTER TABLE public.schedule
ADD COLUMN IF NOT EXISTS instructor_id uuid,
ADD CONSTRAINT schedule_instructor_id_fkey
  FOREIGN KEY (instructor_id)
  REFERENCES public.instructors(id)
  ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_schedule_instructor_id ON public.schedule(instructor_id);

-- Comment
COMMENT ON COLUMN public.schedule.instructor_id IS 'Optional instructor assigned to this scheduled class';
