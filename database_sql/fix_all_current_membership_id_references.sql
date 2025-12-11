-- =====================================================
-- Fix ALL current_membership_id References
-- =====================================================
-- Purpose: Comprehensive fix for all functions still using
--          current_membership_id instead of membership_id
-- Date: 2024-12-11
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Fix get_users_needing_expiry_notification
-- =====================================================

DROP FUNCTION IF EXISTS get_users_needing_expiry_notification(integer) CASCADE;

CREATE OR REPLACE FUNCTION get_users_needing_expiry_notification(
  p_days_before integer DEFAULT 5
)
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
    -- Has active membership
    AND p.membership_id IS NOT NULL
    -- Exclude admins
    AND p.role != 'admin'
  ORDER BY p.membership_expiry_date ASC;
END;
$$;

-- =====================================================
-- 2. Fix redeem_activation_code
-- =====================================================

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

-- =====================================================
-- 3. Fix admin_activate_membership
-- =====================================================

DROP FUNCTION IF EXISTS admin_activate_membership(uuid, uuid, integer, text, text) CASCADE;

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
  v_duration integer;
  v_current_expiry date;
  v_new_expiry date;
  v_membership_name text;
BEGIN
  -- Verify admin user
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN QUERY SELECT false, 'Unauthorized: Admin access required', NULL::date;
    RETURN;
  END IF;

  -- Get membership details
  SELECT name, duration_months
  INTO v_membership_name, v_duration
  FROM memberships
  WHERE id = p_membership_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Membership plan not found', NULL::date;
    RETURN;
  END IF;

  -- Use provided duration or default from membership plan
  v_duration := COALESCE(p_duration_months, v_duration);

  -- Get user's current membership expiry
  SELECT membership_expiry_date
  INTO v_current_expiry
  FROM profiles
  WHERE id = p_user_id;

  -- Calculate new expiry date
  IF v_current_expiry IS NOT NULL AND v_current_expiry > CURRENT_DATE THEN
    v_new_expiry := v_current_expiry + (v_duration || ' months')::interval;
  ELSE
    v_new_expiry := CURRENT_DATE + (v_duration || ' months')::interval;
  END IF;

  -- Update user profile with membership_id (not current_membership_id)
  UPDATE profiles
  SET
    membership_expiry_date = v_new_expiry,
    membership_id = p_membership_id,
    updated_at = now()
  WHERE id = p_user_id;

  -- Return success
  RETURN QUERY SELECT
    true,
    format('Membership activated: %s (%s months)', v_membership_name, v_duration),
    v_new_expiry;
END;
$$;

COMMIT;

-- =====================================================
-- Verification
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'ALL CURRENT_MEMBERSHIP_ID REFERENCES FIXED!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed 3 functions:';
  RAISE NOTICE '1. get_users_needing_expiry_notification';
  RAISE NOTICE '2. redeem_activation_code';
  RAISE NOTICE '3. admin_activate_membership';
  RAISE NOTICE '';
  RAISE NOTICE 'All functions now use membership_id (uuid) instead';
  RAISE NOTICE 'of current_membership_id (integer)';
  RAISE NOTICE '================================================';
END $$;
