-- =====================================================
-- Fix redeem_activation_code Function
-- =====================================================
-- Purpose: Ensure function uses membership_id instead of current_membership_id
-- Date: 2024-12-11
-- =====================================================

BEGIN;

-- Drop and recreate the function
DROP FUNCTION IF EXISTS redeem_activation_code(text) CASCADE;

CREATE OR REPLACE FUNCTION redeem_activation_code(
  p_code text
)
RETURNS TABLE(
  success boolean,
  message text,
  membership_name text,
  new_expiry_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_record RECORD;
  v_user_id uuid;
  v_current_expiry date;
  v_new_expiry date;
  v_membership_name text;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not authenticated', NULL::text, NULL::date;
    RETURN;
  END IF;

  -- Validate and fetch code details
  SELECT
    mac.id,
    mac.membership_id,
    mac.duration_months,
    mac.status,
    mac.expires_at,
    m.name as membership_name
  INTO v_code_record
  FROM membership_activation_codes mac
  JOIN memberships m ON mac.membership_id = m.id
  WHERE mac.code = p_code;

  -- Check if code exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid activation code', NULL::text, NULL::date;
    RETURN;
  END IF;

  -- Check if code is already used
  IF v_code_record.status = 'used' THEN
    RETURN QUERY SELECT false, 'This activation code has already been used', NULL::text, NULL::date;
    RETURN;
  END IF;

  -- Check if code is expired
  IF v_code_record.status = 'expired' OR v_code_record.expires_at < now() THEN
    RETURN QUERY SELECT false, 'This activation code has expired', NULL::text, NULL::date;
    RETURN;
  END IF;

  -- Check if code is inactive
  IF v_code_record.status != 'active' THEN
    RETURN QUERY SELECT false, 'This activation code is not active', NULL::text, NULL::date;
    RETURN;
  END IF;

  -- Get user's current membership expiry
  SELECT membership_expiry_date
  INTO v_current_expiry
  FROM profiles
  WHERE id = v_user_id;

  -- Store membership name for return
  v_membership_name := v_code_record.membership_name;

  -- Calculate new expiry date
  -- If current membership is active (in future), extend from current expiry
  -- Otherwise, start from today
  IF v_current_expiry IS NOT NULL AND v_current_expiry > CURRENT_DATE THEN
    v_new_expiry := v_current_expiry + (v_code_record.duration_months || ' months')::interval;
  ELSE
    v_new_expiry := CURRENT_DATE + (v_code_record.duration_months || ' months')::interval;
  END IF;

  -- Update user profile with membership_id (not current_membership_id)
  UPDATE profiles
  SET
    membership_expiry_date = v_new_expiry,
    membership_id = v_code_record.membership_id,
    updated_at = now()
  WHERE id = v_user_id;

  -- Mark code as used
  UPDATE membership_activation_codes
  SET
    status = 'used',
    used_by = v_user_id,
    used_at = now(),
    updated_at = now()
  WHERE id = v_code_record.id;

  -- Return success
  RETURN QUERY SELECT true, 'Membership activated successfully!'::text, v_membership_name, v_new_expiry;
END;
$$;

COMMIT;

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'REDEEM ACTIVATION CODE FUNCTION FIXED!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed to use membership_id instead of current_membership_id';
  RAISE NOTICE 'Function signature: redeem_activation_code(text)';
  RAISE NOTICE '================================================';
END $$;
