-- This script fixes the "Database error saving new user" by adding the missing
-- 'email' column to the 'public.profiles' table.

ALTER TABLE public.profiles
ADD COLUMN email TEXT;
