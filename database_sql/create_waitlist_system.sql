-- =====================================================
-- Waitlist System Database Migration
-- =====================================================
-- This migration creates tables and functions for the class waitlist system
-- Run this after all previous migrations

-- =====================================================
-- 1. Create waitlist table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL,
  user_id uuid NOT NULL,
  queue_position integer NOT NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'converted', 'expired', 'cancelled')),
  notified_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT waitlist_pkey PRIMARY KEY (id),
  CONSTRAINT waitlist_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.schedule(id) ON DELETE CASCADE,
  CONSTRAINT waitlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT unique_waitlist_entry UNIQUE (schedule_id, user_id)
);

-- Add comment
COMMENT ON TABLE public.waitlist IS 'Waitlist entries for full classes. Members are automatically notified when spots open up.';
COMMENT ON COLUMN public.waitlist.queue_position IS 'Position in the waitlist queue (1 = first in line)';
COMMENT ON COLUMN public.waitlist.status IS 'waiting = in queue, notified = spot available, converted = booked the class, expired = notification expired, cancelled = member left waitlist';
COMMENT ON COLUMN public.waitlist.expires_at IS 'When the notification expires (24 hours after being notified)';

-- =====================================================
-- 2. Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_waitlist_schedule_id ON public.waitlist(schedule_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_user_id ON public.waitlist(user_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_position ON public.waitlist(schedule_id, queue_position) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_waitlist_expires_at ON public.waitlist(expires_at) WHERE status = 'notified';

-- =====================================================
-- 3. Enable Row Level Security
-- =====================================================

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. Create RLS Policies
-- =====================================================

-- Users can view their own waitlist entries
CREATE POLICY "Users can view their own waitlist entries"
  ON public.waitlist FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own waitlist entries
CREATE POLICY "Users can insert their own waitlist entries"
  ON public.waitlist FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'waiting');

-- Users can update their own waitlist entries (to cancel)
CREATE POLICY "Users can update their own waitlist entries"
  ON public.waitlist FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own waitlist entries
CREATE POLICY "Users can delete their own waitlist entries"
  ON public.waitlist FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage all waitlist entries (for edge functions)
CREATE POLICY "Service role can manage all waitlist entries"
  ON public.waitlist FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Admins can view all waitlist entries
CREATE POLICY "Admins can view all waitlist entries"
  ON public.waitlist FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Admins can manage all waitlist entries
CREATE POLICY "Admins can manage all waitlist entries"
  ON public.waitlist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- =====================================================
-- 5. Helper Function: Get next waitlist position
-- =====================================================

CREATE OR REPLACE FUNCTION get_next_waitlist_position(p_schedule_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_position integer;
BEGIN
  -- Get the highest position for waiting entries, add 1
  SELECT COALESCE(MAX(queue_position), 0) + 1
  INTO next_position
  FROM public.waitlist
  WHERE schedule_id = p_schedule_id
    AND status = 'waiting';

  RETURN next_position;
END;
$$;

COMMENT ON FUNCTION get_next_waitlist_position IS 'Returns the next available position number for a schedule waitlist';

-- =====================================================
-- 6. Trigger Function: Update waitlist positions
-- =====================================================

CREATE OR REPLACE FUNCTION update_waitlist_positions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a waitlist entry is deleted or status changed from 'waiting'
  IF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.status != 'waiting' AND OLD.status = 'waiting')) THEN
    -- Decrement position for all entries after the removed one
    UPDATE public.waitlist
    SET queue_position = queue_position - 1,
        updated_at = now()
    WHERE schedule_id = OLD.schedule_id
      AND queue_position > OLD.queue_position
      AND status = 'waiting';
  END IF;

  -- Return appropriate value based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

COMMENT ON FUNCTION update_waitlist_positions IS 'Automatically adjusts waitlist positions when someone leaves the queue';

-- =====================================================
-- 7. Create trigger to maintain positions
-- =====================================================

DROP TRIGGER IF EXISTS maintain_waitlist_positions ON public.waitlist;

CREATE TRIGGER maintain_waitlist_positions
AFTER DELETE OR UPDATE ON public.waitlist
FOR EACH ROW
EXECUTE FUNCTION update_waitlist_positions();

-- =====================================================
-- 8. Helper Function: Get waitlist count for schedule
-- =====================================================

CREATE OR REPLACE FUNCTION get_waitlist_count(p_schedule_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM public.waitlist
  WHERE schedule_id = p_schedule_id
    AND status = 'waiting';
$$;

COMMENT ON FUNCTION get_waitlist_count IS 'Returns the number of people waiting for a specific class';

-- =====================================================
-- 9. Helper Function: Get user waitlist position
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_waitlist_position(p_schedule_id uuid, p_user_id uuid)
RETURNS TABLE (
  queue_position integer,
  status text,
  expires_at timestamp with time zone
)
LANGUAGE sql
STABLE
AS $$
  SELECT queue_position, status, expires_at
  FROM public.waitlist
  WHERE schedule_id = p_schedule_id
    AND user_id = p_user_id
  LIMIT 1;
$$;

COMMENT ON FUNCTION get_user_waitlist_position IS 'Returns a user''s position and status for a specific class waitlist';

-- =====================================================
-- 10. Function: Process expired waitlist notifications
-- =====================================================

CREATE OR REPLACE FUNCTION process_expired_waitlist_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count integer;
BEGIN
  -- Update expired notifications to 'expired' status
  WITH expired_entries AS (
    UPDATE public.waitlist
    SET status = 'expired',
        updated_at = now()
    WHERE status = 'notified'
      AND expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO expired_count FROM expired_entries;

  RETURN expired_count;
END;
$$;

COMMENT ON FUNCTION process_expired_waitlist_notifications IS 'Marks expired waitlist notifications as expired. Should be run periodically via cron.';

-- =====================================================
-- 11. Add waitlist notification types to notifications table
-- =====================================================

-- Check if the constraint exists and drop it if it does
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
  END IF;
END $$;

-- Add the new constraint with waitlist types
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'class_cancelled',
  'class_rescheduled',
  'booking_confirmed',
  'membership_expiring',
  'general',
  'waitlist_spot_available',
  'waitlist_expired',
  'waitlist_joined'
));

-- =====================================================
-- 12. Grant necessary permissions
-- =====================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_next_waitlist_position TO authenticated;
GRANT EXECUTE ON FUNCTION get_waitlist_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_waitlist_position TO authenticated;

-- Grant execute on cleanup function to service role only
GRANT EXECUTE ON FUNCTION process_expired_waitlist_notifications TO service_role;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE 'Waitlist system migration completed successfully!';
  RAISE NOTICE 'Tables created: waitlist';
  RAISE NOTICE 'Functions created: 4 helper functions';
  RAISE NOTICE 'Triggers created: maintain_waitlist_positions';
  RAISE NOTICE 'RLS policies: 7 policies enabled';
END $$;
