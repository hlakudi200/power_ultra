-- Migration: Add avatar_url column to profiles table
-- Purpose: Support Google OAuth profile pictures and future avatar uploads
-- Date: November 29, 2024

-- ============================================================================
-- 1. Add avatar_url Column to Profiles
-- ============================================================================

-- Add avatar_url column if it doesn't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user profile picture (from OAuth provider or uploaded)';

-- ============================================================================
-- 2. Create Index for Performance
-- ============================================================================

-- Index for queries filtering by users with avatars
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON public.profiles(avatar_url) WHERE avatar_url IS NOT NULL;

-- ============================================================================
-- 3. Update RLS Policies (if needed)
-- ============================================================================

-- Users can read their own avatar_url (should already be covered by existing policies)
-- Users can update their own avatar_url (should already be covered by existing policies)
-- This is just a reminder to verify RLS policies allow avatar_url access

-- ============================================================================
-- 4. Grant Permissions
-- ============================================================================

-- Ensure authenticated users can read and update avatar_url
-- (This should be inherited from table permissions, but explicitly documented here)

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✅ Added avatar_url column to profiles table
-- ✅ Added performance index
-- ✅ Documented column purpose
-- ✅ Ready for Google OAuth integration
