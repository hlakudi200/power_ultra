-- =====================================================
-- Migration: Fix Expiry Notification Function
-- =====================================================
-- Purpose: Update get_users_needing_expiry_notification function
--          to use membership_id instead of current_membership_id
-- Date: 2024-12-11
-- =====================================================

BEGIN;

-- =====================================================
-- Drop the old function first (required for return type change)
-- =====================================================

DROP FUNCTION IF EXISTS get_users_needing_expiry_notification(integer);

-- =====================================================
-- Create the function with corrected return type
-- =====================================================

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
-- Summary
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'EXPIRY NOTIFICATION FUNCTION UPDATED!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated get_users_needing_expiry_notification()';
  RAISE NOTICE 'to use membership_id (uuid) instead of';
  RAISE NOTICE 'current_membership_id (integer)';
  RAISE NOTICE '================================================';
END $$;
