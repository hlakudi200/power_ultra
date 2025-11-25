-- add_names_to_profiles.sql

-- Add first_name and last_name columns to the profiles table
ALTER TABLE public.profiles
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT;

-- Optional: Add a comment to describe the new columns
COMMENT ON COLUMN public.profiles.first_name IS 'User''s first name';
COMMENT ON COLUMN public.profiles.last_name IS 'User''s last name';

-- Update RLS policies for the new columns if necessary.
-- For now, we assume the existing policies which allow users to update their own profiles are sufficient.
-- We will re-evaluate this if we build a full admin-editable profile system.

-- Backfill existing users with a placeholder if you want
-- UPDATE public.profiles
-- SET first_name = 'User', last_name = split_part(email, '@', 1)
-- WHERE first_name IS NULL;
