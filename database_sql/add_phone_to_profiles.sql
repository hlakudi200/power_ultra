-- add_phone_to_profiles.sql

-- Add phone column to the profiles table
ALTER TABLE public.profiles
ADD COLUMN phone TEXT;

-- Add a comment to describe the new column
COMMENT ON COLUMN public.profiles.phone IS 'User''s phone number';
