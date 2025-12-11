-- =====================================================
-- Verification: Check Membership Columns in Profiles
-- =====================================================
-- Run this to see which membership-related columns exist
-- =====================================================

-- Check all columns in profiles table
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE '%membership%'
ORDER BY column_name;

-- Check foreign keys on profiles table
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'profiles'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'memberships'
ORDER BY tc.constraint_name;
