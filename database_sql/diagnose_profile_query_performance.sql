-- =====================================================
-- Diagnose Profile Query Performance
-- =====================================================
-- Purpose: Check indexes, foreign keys, and RLS policies
--          that might be slowing down profile queries
-- =====================================================

-- 1. Check current indexes on profiles table
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY indexname;

-- 2. Check RLS policies on profiles table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles' AND schemaname = 'public'
ORDER BY policyname;

-- 3. Check foreign keys on profiles table
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'profiles'
    AND tc.table_schema = 'public';

-- 4. Check if RLS is enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'profiles' AND schemaname = 'public';

-- 5. Test query performance (run as authenticated user)
EXPLAIN ANALYZE
SELECT membership_expiry_date, is_admin, role
FROM profiles
WHERE id = auth.uid()
LIMIT 1;

-- =====================================================
-- Recommended Fixes
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'PROFILE QUERY DIAGNOSTICS';
    RAISE NOTICE '=================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Check the results above for:';
    RAISE NOTICE '1. Missing indexes (should have idx_profiles_id)';
    RAISE NOTICE '2. RLS policies (should have 4 user policies)';
    RAISE NOTICE '3. Foreign keys (check if membership_id FK exists)';
    RAISE NOTICE '4. RLS enabled (should be true)';
    RAISE NOTICE '';
    RAISE NOTICE 'If query is slow:';
    RAISE NOTICE '- Ensure idx_profiles_id index exists';
    RAISE NOTICE '- Check if membership_id FK is causing slowdown';
    RAISE NOTICE '- Verify RLS policies use (SELECT auth.uid())';
    RAISE NOTICE '=================================================';
END $$;
