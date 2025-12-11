-- =====================================================
-- Complete Membership ID Cleanup
-- =====================================================
-- Purpose: Comprehensive cleanup of current_membership_id
--          This migration handles everything in one go:
--          1. Drop current_membership_id column
--          2. Fix the expiry notification function
-- Date: 2024-12-11
-- =====================================================

BEGIN;

-- =====================================================
-- Step 1: Force drop the current_membership_id column
-- =====================================================

DO $$
BEGIN
  -- Drop the column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'current_membership_id'
  ) THEN
    -- Force drop the column (CASCADE will drop any dependencies)
    ALTER TABLE public.profiles
    DROP COLUMN current_membership_id CASCADE;

    RAISE NOTICE '✓ Dropped current_membership_id column and all dependencies';
  ELSE
    RAISE NOTICE '- current_membership_id column does not exist';
  END IF;
END $$;

-- =====================================================
-- Step 2: Drop and recreate the expiry notification function
-- =====================================================

-- Drop the old function
DROP FUNCTION IF EXISTS get_users_needing_expiry_notification(integer) CASCADE;

-- Create the corrected function
CREATE OR REPLACE FUNCTION get_users_needing_expiry_notification(p_days_before integer DEFAULT 5)
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  membership_expiry_date date,
  membership_id uuid,
  days_until_expiry integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_target_date date;
BEGIN
  -- Calculate target expiry date (e.g., 5 days from now)
  v_target_date := CURRENT_DATE + (p_days_before || ' days')::interval;

  RETURN QUERY
  SELECT
    p.id as user_id,
    p.email,
    p.full_name,
    p.membership_expiry_date,
    p.membership_id,
    (p.membership_expiry_date - CURRENT_DATE)::integer as days_until_expiry
  FROM profiles p
  WHERE
    -- Membership expires on target date
    p.membership_expiry_date = v_target_date
    -- Has email
    AND p.email IS NOT NULL
    -- Has not been notified yet for this expiry date
    AND NOT EXISTS (
      SELECT 1
      FROM membership_notifications mn
      WHERE mn.user_id = p.id
        AND mn.notification_type = 'expiry_warning'
        AND mn.expiry_date = p.membership_expiry_date
        AND mn.delivery_status = 'sent'
    );
END;
$$;

COMMIT;

-- =====================================================
-- Verification
-- =====================================================

DO $$
DECLARE
  v_column_exists boolean;
  v_fk_count integer;
BEGIN
  -- Check if current_membership_id still exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'current_membership_id'
  ) INTO v_column_exists;

  -- Count foreign keys to memberships table
  SELECT COUNT(*) INTO v_fk_count
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'profiles'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'memberships';

  RAISE NOTICE '================================================';
  RAISE NOTICE 'COMPLETE MEMBERSHIP ID CLEANUP FINISHED!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Verification Results:';

  IF v_column_exists THEN
    RAISE WARNING '  ⚠ current_membership_id column still exists!';
  ELSE
    RAISE NOTICE '  ✓ current_membership_id column removed';
  END IF;

  RAISE NOTICE '  ✓ Foreign keys to memberships: %', v_fk_count;

  IF v_fk_count = 1 THEN
    RAISE NOTICE '  ✓ Correct! Only one FK relationship (membership_id)';
  ELSE
    RAISE WARNING '  ⚠ Expected 1 FK, found %', v_fk_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Changes completed:';
  RAISE NOTICE '1. Removed current_membership_id column';
  RAISE NOTICE '2. Updated get_users_needing_expiry_notification function';
  RAISE NOTICE '3. Profiles table now uses only membership_id';
  RAISE NOTICE '================================================';
END $$;
