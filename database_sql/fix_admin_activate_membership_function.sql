-- =====================================================
-- Fix admin_activate_membership Function
-- =====================================================
-- Purpose: Update function to use membership_id instead of current_membership_id
-- Date: 2024-12-11
-- =====================================================

BEGIN;

-- Drop the old function
DROP FUNCTION IF EXISTS admin_activate_membership(uuid, uuid, integer, text, text) CASCADE;

-- Recreate with correct column name
CREATE OR REPLACE FUNCTION admin_activate_membership(
  p_user_id uuid,
  p_membership_id uuid,
  p_duration_months integer DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_external_reference text DEFAULT NULL
)
RETURNS TABLE(
  success boolean,
  message text,
  new_expiry_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_is_admin boolean;
  v_duration integer;
  v_current_expiry date;
  v_new_expiry date;
  v_membership_name text;
BEGIN
  -- Get the current user (admin)
  v_admin_id := auth.uid();

  -- Check if current user is admin
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = v_admin_id;

  IF NOT v_is_admin THEN
    RETURN QUERY SELECT false, 'Unauthorized: Admin access required', NULL::date;
    RETURN;
  END IF;

  -- Get membership details
  SELECT name, duration_months INTO v_membership_name, v_duration
  FROM memberships
  WHERE id = p_membership_id;

  IF v_membership_name IS NULL THEN
    RETURN QUERY SELECT false, 'Membership plan not found', NULL::date;
    RETURN;
  END IF;

  -- Use custom duration if provided, otherwise use plan's default
  IF p_duration_months IS NOT NULL THEN
    v_duration := p_duration_months;
  END IF;

  -- Get user's current expiry date
  SELECT membership_expiry_date INTO v_current_expiry
  FROM profiles
  WHERE id = p_user_id;

  -- Calculate new expiry date
  -- If current membership is active (in future), extend from current expiry
  -- Otherwise, start from today
  IF v_current_expiry IS NOT NULL AND v_current_expiry > CURRENT_DATE THEN
    v_new_expiry := v_current_expiry + (v_duration || ' months')::interval;
  ELSE
    v_new_expiry := CURRENT_DATE + (v_duration || ' months')::interval;
  END IF;

  -- Update user profile
  UPDATE profiles
  SET
    membership_expiry_date = v_new_expiry,
    membership_id = p_membership_id,
    updated_at = now()
  WHERE id = p_user_id;

  -- Log this activation in audit log (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'membership_audit_log') THEN
    INSERT INTO membership_audit_log (
      user_id,
      admin_id,
      membership_id,
      action,
      duration_months,
      new_expiry_date,
      notes,
      external_reference
    ) VALUES (
      p_user_id,
      v_admin_id,
      p_membership_id,
      'admin_activated',
      v_duration,
      v_new_expiry,
      p_notes,
      p_external_reference
    );
  END IF;

  -- Return success
  RETURN QUERY SELECT
    true,
    format('Membership activated successfully. %s plan (%s months) expires on %s',
           v_membership_name, v_duration, v_new_expiry::text),
    v_new_expiry;
END;
$$;

COMMIT;

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'ADMIN ACTIVATE MEMBERSHIP FUNCTION UPDATED!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated admin_activate_membership() function';
  RAISE NOTICE 'to use membership_id instead of current_membership_id';
  RAISE NOTICE '================================================';
END $$;
