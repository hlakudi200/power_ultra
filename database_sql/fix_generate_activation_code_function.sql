-- =====================================================
-- Fix generate_activation_code Function
-- =====================================================
-- Purpose: Fix ambiguous column reference error
-- Date: 2024-12-11
-- =====================================================

BEGIN;

-- Drop and recreate the function
DROP FUNCTION IF EXISTS generate_activation_code(uuid, integer, integer, text, text) CASCADE;

CREATE OR REPLACE FUNCTION generate_activation_code(
  p_membership_id uuid,
  p_duration_months integer DEFAULT NULL,
  p_expires_in_days integer DEFAULT 30,
  p_notes text DEFAULT NULL,
  p_external_reference text DEFAULT NULL
)
RETURNS TABLE(
  success boolean,
  code text,
  expires_at timestamp with time zone,
  membership_name text,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_duration integer;
  v_membership_name text;
  v_expires_at timestamp with time zone;
BEGIN
  -- Get membership details
  SELECT name, duration_months
  INTO v_membership_name, v_duration
  FROM memberships
  WHERE id = p_membership_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::text, NULL::timestamp with time zone, NULL::text, 'Membership plan not found'::text;
    RETURN;
  END IF;

  -- Use provided duration or default from membership plan
  v_duration := COALESCE(p_duration_months, v_duration);

  -- Generate unique code (format: PUGS-XXXX-XXXX-XXXX)
  -- PUGS = Power Ultra Gym System
  LOOP
    v_code := 'PUGS-' ||
              UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 4)) || '-' ||
              UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 4)) || '-' ||
              UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 4));

    -- Check if code already exists
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM membership_activation_codes WHERE membership_activation_codes.code = v_code
    );
  END LOOP;

  -- Set expiry date
  v_expires_at := now() + (p_expires_in_days || ' days')::interval;

  -- Insert code
  INSERT INTO public.membership_activation_codes (
    code,
    membership_id,
    duration_months,
    status,
    created_by,
    expires_at,
    notes,
    external_reference
  ) VALUES (
    v_code,
    p_membership_id,
    v_duration,
    'active',
    auth.uid(),
    v_expires_at,
    p_notes,
    p_external_reference
  );

  -- Return code details with explicit column names
  RETURN QUERY SELECT
    true AS success,
    v_code AS code,
    v_expires_at AS expires_at,
    v_membership_name AS membership_name,
    format('Activation code generated successfully: %s', v_code) AS message;
END;
$$;

COMMIT;

-- =====================================================
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'GENERATE ACTIVATION CODE FUNCTION FIXED!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed ambiguous column reference error';
  RAISE NOTICE 'Added success/message fields to return type';
  RAISE NOTICE '================================================';
END $$;
