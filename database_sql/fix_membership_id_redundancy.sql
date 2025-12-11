-- =====================================================
-- Migration: Fix Membership ID Redundancy
-- =====================================================
-- Purpose: Remove the redundant current_membership_id column
--          The existing membership_id column is the correct one to use
-- Date: 2024-12-11
-- =====================================================

BEGIN;

-- =====================================================
-- Drop the redundant current_membership_id column
-- =====================================================

DO $$
BEGIN
  -- Check if the column exists before attempting to drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'current_membership_id'
  ) THEN
    ALTER TABLE public.profiles
    DROP COLUMN current_membership_id;

    RAISE NOTICE '✓ Dropped redundant current_membership_id column';
  ELSE
    RAISE NOTICE '- current_membership_id column does not exist (already removed)';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'MEMBERSHIP ID REDUNDANCY FIX COMPLETED!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Removed redundant current_membership_id column.';
  RAISE NOTICE 'The profiles table now uses only membership_id';
  RAISE NOTICE 'to track user membership plans.';
  RAISE NOTICE '================================================';
END $$;
