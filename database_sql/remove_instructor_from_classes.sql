-- Remove deprecated instructor columns from classes table
-- The instructor field (text) is no longer needed since we have:
-- 1. A dedicated instructors table with full profiles
-- 2. Schedule items that assign instructors to specific class times

-- Drop the text instructor column
ALTER TABLE public.classes
DROP COLUMN IF EXISTS instructor;

-- Drop the instructor_id column from classes (instructors are assigned at schedule level, not class level)
ALTER TABLE public.classes
DROP COLUMN IF EXISTS instructor_id;

-- Add comment to clarify the design
COMMENT ON TABLE public.classes IS 'Defines class types (Yoga, HIIT, etc.). Instructors are assigned to specific schedule items, not class types.';
