-- =====================================================
-- Fix Notifications RLS Policy for Waitlist
-- =====================================================
-- This adds a policy allowing users to create notifications for themselves
-- Required for waitlist system where users create their own notifications

-- Add policy for users to insert their own notifications
CREATE POLICY "Users can insert their own notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grant INSERT permission to authenticated users (if not already granted)
GRANT INSERT ON public.notifications TO authenticated;

-- Verify policies
DO $$
BEGIN
  RAISE NOTICE 'Notifications RLS policy updated successfully!';
  RAISE NOTICE 'Users can now create notifications for themselves';
END $$;
