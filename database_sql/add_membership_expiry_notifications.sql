-- =====================================================
-- Membership Expiry Notification System
-- =====================================================
-- Purpose: Notify users 5 days before membership expires
--
-- Features:
-- 1. Track notification history
-- 2. Prevent duplicate notifications
-- 3. Schedule daily checks via cron job
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Create notifications table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.membership_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Notification details
  notification_type text NOT NULL CHECK (notification_type IN ('expiry_warning', 'expired', 'renewal_reminder')),
  expiry_date date NOT NULL,

  -- Delivery tracking
  sent_at timestamp with time zone DEFAULT now(),
  delivery_status text DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'failed', 'pending')),
  error_message text,

  -- Metadata
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX idx_membership_notifications_user_id ON public.membership_notifications(user_id);
CREATE INDEX idx_membership_notifications_type ON public.membership_notifications(notification_type);
CREATE INDEX idx_membership_notifications_sent_at ON public.membership_notifications(sent_at);
CREATE INDEX idx_membership_notifications_expiry_date ON public.membership_notifications(expiry_date);

-- Composite index for checking if notification was already sent
CREATE INDEX idx_membership_notifications_user_type_expiry
  ON public.membership_notifications(user_id, notification_type, expiry_date);

-- =====================================================
-- 2. Function to check which users need notifications
-- =====================================================

CREATE OR REPLACE FUNCTION get_users_needing_expiry_notification(p_days_before integer DEFAULT 5)
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  membership_expiry_date date,
  current_membership_id integer,
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
    p.current_membership_id,
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

-- =====================================================
-- 3. Function to manually trigger notification check
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_expiry_notifications()
RETURNS TABLE(
  users_found integer,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Count users needing notifications
  SELECT COUNT(*)::integer INTO v_count
  FROM get_users_needing_expiry_notification(5);

  IF v_count = 0 THEN
    RETURN QUERY SELECT 0, 'No users need expiry notifications at this time';
  ELSE
    -- In production, this would invoke the edge function
    -- For now, just return the count
    RETURN QUERY SELECT v_count, format('%s users need expiry notifications', v_count);
  END IF;
END;
$$;

-- =====================================================
-- 4. RLS Policies for notifications table
-- =====================================================

-- Enable RLS
ALTER TABLE public.membership_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.membership_notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
  ON public.membership_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- System can insert notifications (via service role)
CREATE POLICY "Service role can insert notifications"
  ON public.membership_notifications
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 5. Set up cron job for daily expiry checks
-- =====================================================

-- Remove existing cron job if it exists
SELECT cron.unschedule('daily-membership-expiry-check')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-membership-expiry-check'
);

-- Schedule daily check at 9:00 AM
-- This will invoke the Supabase Edge Function
SELECT cron.schedule(
  'daily-membership-expiry-check',
  '0 9 * * *',  -- Every day at 9:00 AM
  $$
  SELECT
    net.http_post(
      url := (SELECT current_setting('app.supabase_url', true) || '/functions/v1/check-membership-expiry'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.supabase_service_role_key', true))
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- =====================================================
-- 6. Helper function to get notification statistics
-- =====================================================

CREATE OR REPLACE FUNCTION get_notification_stats(p_days integer DEFAULT 30)
RETURNS TABLE(
  total_notifications integer,
  notifications_sent integer,
  notifications_failed integer,
  unique_users_notified integer,
  date_range text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date date;
BEGIN
  v_start_date := CURRENT_DATE - (p_days || ' days')::interval;

  RETURN QUERY
  SELECT
    COUNT(*)::integer as total_notifications,
    COUNT(*) FILTER (WHERE delivery_status = 'sent')::integer as notifications_sent,
    COUNT(*) FILTER (WHERE delivery_status = 'failed')::integer as notifications_failed,
    COUNT(DISTINCT user_id)::integer as unique_users_notified,
    format('Last %s days', p_days) as date_range
  FROM public.membership_notifications
  WHERE sent_at >= v_start_date;
END;
$$;

-- =====================================================
-- 7. Function to manually send test notification
-- =====================================================

CREATE OR REPLACE FUNCTION test_expiry_notification(p_user_id uuid)
RETURNS TABLE(
  success boolean,
  message text,
  user_email text,
  expiry_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record RECORD;
BEGIN
  -- Get user details
  SELECT id, email, full_name, membership_expiry_date
  INTO v_user_record
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'User not found', NULL::text, NULL::date;
    RETURN;
  END IF;

  IF v_user_record.membership_expiry_date IS NULL THEN
    RETURN QUERY SELECT false, 'User has no active membership', v_user_record.email, NULL::date;
    RETURN;
  END IF;

  -- In production, this would invoke the edge function
  -- For now, just log the notification
  INSERT INTO membership_notifications (
    user_id,
    notification_type,
    expiry_date,
    delivery_status
  ) VALUES (
    p_user_id,
    'expiry_warning',
    v_user_record.membership_expiry_date,
    'sent'
  );

  RETURN QUERY SELECT
    true,
    format('Test notification logged for %s', v_user_record.email),
    v_user_record.email,
    v_user_record.membership_expiry_date;
END;
$$;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'MEMBERSHIP EXPIRY NOTIFICATION SYSTEM INSTALLED!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  ✓ Notifications table created';
  RAISE NOTICE '  ✓ Daily cron job scheduled (9:00 AM)';
  RAISE NOTICE '  ✓ Tracks notification history';
  RAISE NOTICE '  ✓ Prevents duplicate notifications';
  RAISE NOTICE '';
  RAISE NOTICE 'Available Functions:';
  RAISE NOTICE '';
  RAISE NOTICE '1. Check who needs notifications:';
  RAISE NOTICE '   SELECT * FROM get_users_needing_expiry_notification(5);';
  RAISE NOTICE '';
  RAISE NOTICE '2. Trigger notifications manually:';
  RAISE NOTICE '   SELECT * FROM trigger_expiry_notifications();';
  RAISE NOTICE '';
  RAISE NOTICE '3. View notification statistics:';
  RAISE NOTICE '   SELECT * FROM get_notification_stats(30);';
  RAISE NOTICE '';
  RAISE NOTICE '4. Test notification for specific user:';
  RAISE NOTICE '   SELECT * FROM test_expiry_notification(''user-uuid'');';
  RAISE NOTICE '';
  RAISE NOTICE 'Cron Job Schedule:';
  RAISE NOTICE '  Job Name: daily-membership-expiry-check';
  RAISE NOTICE '  Schedule: Every day at 9:00 AM';
  RAISE NOTICE '  Action: Invokes check-membership-expiry edge function';
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'IMPORTANT: Configure environment variables:';
  RAISE NOTICE '  - app.supabase_url';
  RAISE NOTICE '  - app.supabase_service_role_key';
  RAISE NOTICE '  - RESEND_API_KEY (in edge function)';
  RAISE NOTICE '================================================';
END $$;
