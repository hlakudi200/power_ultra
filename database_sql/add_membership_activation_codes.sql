-- =====================================================
-- Membership Activation Code System
-- =====================================================
-- Purpose: Allow external billing with activation codes
--
-- Features:
-- 1. Generate unique activation codes
-- 2. Include membership metadata in code
-- 3. User can activate membership with code
-- 4. Admin can quickly activate memberships
-- 5. Track code usage and audit trail
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Create activation codes table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.membership_activation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,

  -- Membership details
  membership_id uuid NOT NULL REFERENCES memberships(id),
  duration_months integer NOT NULL,

  -- Code status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),

  -- Usage tracking
  created_by uuid REFERENCES profiles(id), -- Admin who created code
  used_by uuid REFERENCES profiles(id), -- User who redeemed code
  used_at timestamp with time zone,

  -- Expiry
  expires_at timestamp with time zone NOT NULL,

  -- Metadata
  notes text, -- Admin notes (e.g., "Paid via bank transfer #12345")
  external_reference text, -- External billing system reference

  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_activation_codes_code ON public.membership_activation_codes(code);
CREATE INDEX idx_activation_codes_status ON public.membership_activation_codes(status);
CREATE INDEX idx_activation_codes_created_by ON public.membership_activation_codes(created_by);
CREATE INDEX idx_activation_codes_used_by ON public.membership_activation_codes(used_by);

-- =====================================================
-- 2. Function to generate activation code
-- =====================================================

CREATE OR REPLACE FUNCTION generate_activation_code(
  p_membership_id uuid,
  p_duration_months integer DEFAULT NULL,
  p_expires_in_days integer DEFAULT 30,
  p_notes text DEFAULT NULL,
  p_external_reference text DEFAULT NULL
)
RETURNS TABLE(
  code text,
  expires_at timestamp with time zone,
  membership_name text
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
    RAISE EXCEPTION 'Membership plan not found';
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
      SELECT 1 FROM membership_activation_codes WHERE code = v_code
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

  -- Return code details
  RETURN QUERY SELECT v_code, v_expires_at, v_membership_name;
END;
$$;

-- =====================================================
-- 3. Function to validate and redeem activation code
-- =====================================================

CREATE OR REPLACE FUNCTION redeem_activation_code(p_code text)
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
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'You must be logged in to redeem a code', NULL::text, NULL::date;
    RETURN;
  END IF;

  -- Get code details
  SELECT * INTO v_code_record
  FROM membership_activation_codes
  WHERE code = UPPER(TRIM(p_code));

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid activation code', NULL::text, NULL::date;
    RETURN;
  END IF;

  -- Check if code is active
  IF v_code_record.status != 'active' THEN
    RETURN QUERY SELECT false, 'This code has already been used', NULL::text, NULL::date;
    RETURN;
  END IF;

  -- Check if code is expired
  IF v_code_record.expires_at < now() THEN
    -- Mark as expired
    UPDATE membership_activation_codes
    SET status = 'expired', updated_at = now()
    WHERE id = v_code_record.id;

    RETURN QUERY SELECT false, 'This code has expired', NULL::text, NULL::date;
    RETURN;
  END IF;

  -- Get membership name
  SELECT name INTO v_membership_name
  FROM memberships
  WHERE id = v_code_record.membership_id;

  -- Get user's current expiry date
  SELECT membership_expiry_date INTO v_current_expiry
  FROM profiles
  WHERE id = v_user_id;

  -- Calculate new expiry date
  -- If current membership is active (in future), extend from current expiry
  -- Otherwise, start from today
  IF v_current_expiry IS NOT NULL AND v_current_expiry > CURRENT_DATE THEN
    v_new_expiry := v_current_expiry + (v_code_record.duration_months || ' months')::interval;
  ELSE
    v_new_expiry := CURRENT_DATE + (v_code_record.duration_months || ' months')::interval;
  END IF;

  -- Update user profile
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
  RETURN QUERY SELECT true, 'Membership activated successfully!', v_membership_name, v_new_expiry;
END;
$$;

-- =====================================================
-- 4. Function for admin to quickly activate membership
-- =====================================================

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
  -- Get current user and check if admin
  v_admin_id := auth.uid();

  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = v_admin_id;

  IF NOT v_is_admin THEN
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

  -- Get user's current expiry date
  SELECT membership_expiry_date INTO v_current_expiry
  FROM profiles
  WHERE id = p_user_id;

  -- Calculate new expiry date
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
      changed_by,
      action,
      old_expiry_date,
      new_expiry_date,
      membership_id,
      reason
    ) VALUES (
      p_user_id,
      v_admin_id,
      'admin_activation',
      v_current_expiry,
      v_new_expiry,
      p_membership_id,
      COALESCE(p_notes, 'Admin manual activation')
    );
  END IF;

  -- Return success
  RETURN QUERY SELECT
    true,
    format('Membership activated: %s (%s months) - expires %s',
           v_membership_name, v_duration, v_new_expiry::text),
    v_new_expiry;
END;
$$;

-- =====================================================
-- 5. Ensure membership_id column exists in profiles
-- =====================================================
-- Note: This column already exists in the schema (profiles.membership_id)
-- We're just verifying it exists and has the correct foreign key constraint

DO $$
BEGIN
  -- The membership_id column should already exist in profiles table
  -- This is just a verification step
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'membership_id'
  ) THEN
    RAISE EXCEPTION 'ERROR: membership_id column does not exist in profiles table. Please check your schema.';
  ELSE
    RAISE NOTICE '✓ Verified membership_id column exists in profiles table';
  END IF;
END $$;

-- =====================================================
-- 6. RLS Policies for activation codes
-- =====================================================

-- Enable RLS
ALTER TABLE public.membership_activation_codes ENABLE ROW LEVEL SECURITY;

-- Admins can view all codes
CREATE POLICY "Admins can view all activation codes"
  ON public.membership_activation_codes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can insert codes
CREATE POLICY "Admins can create activation codes"
  ON public.membership_activation_codes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can update codes
CREATE POLICY "Admins can update activation codes"
  ON public.membership_activation_codes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Users can view their own redeemed codes
CREATE POLICY "Users can view their redeemed codes"
  ON public.membership_activation_codes
  FOR SELECT
  USING (used_by = auth.uid());

-- =====================================================
-- 7. Helper function to get code statistics
-- =====================================================

CREATE OR REPLACE FUNCTION get_activation_code_stats()
RETURNS TABLE(
  total_codes integer,
  active_codes integer,
  used_codes integer,
  expired_codes integer,
  cancelled_codes integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::integer as total_codes,
    COUNT(*) FILTER (WHERE status = 'active')::integer as active_codes,
    COUNT(*) FILTER (WHERE status = 'used')::integer as used_codes,
    COUNT(*) FILTER (WHERE status = 'expired')::integer as expired_codes,
    COUNT(*) FILTER (WHERE status = 'cancelled')::integer as cancelled_codes
  FROM public.membership_activation_codes;
END;
$$;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'MEMBERSHIP ACTIVATION CODE SYSTEM INSTALLED!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Available Functions:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Generate Code (Admin):';
  RAISE NOTICE '   SELECT * FROM generate_activation_code(';
  RAISE NOTICE '     p_membership_id := 1,';
  RAISE NOTICE '     p_duration_months := 3,';
  RAISE NOTICE '     p_expires_in_days := 30,';
  RAISE NOTICE '     p_notes := ''Paid via bank transfer'',';
  RAISE NOTICE '     p_external_reference := ''INV-12345''';
  RAISE NOTICE '   );';
  RAISE NOTICE '';
  RAISE NOTICE '2. Redeem Code (User):';
  RAISE NOTICE '   SELECT * FROM redeem_activation_code(''PUGS-XXXX-XXXX-XXXX'');';
  RAISE NOTICE '';
  RAISE NOTICE '3. Quick Activate (Admin):';
  RAISE NOTICE '   SELECT * FROM admin_activate_membership(';
  RAISE NOTICE '     p_user_id := ''user-uuid'',';
  RAISE NOTICE '     p_membership_id := 1,';
  RAISE NOTICE '     p_notes := ''Paid cash''';
  RAISE NOTICE '   );';
  RAISE NOTICE '';
  RAISE NOTICE '4. View Statistics:';
  RAISE NOTICE '   SELECT * FROM get_activation_code_stats();';
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
END $$;
