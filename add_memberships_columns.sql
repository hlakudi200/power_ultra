-- Add missing columns to memberships table
-- Adds description and is_active columns

-- =====================================================
-- 1. ADD DESCRIPTION COLUMN
-- =====================================================

ALTER TABLE public.memberships
ADD COLUMN IF NOT EXISTS description TEXT;

-- =====================================================
-- 2. ADD IS_ACTIVE COLUMN
-- =====================================================

ALTER TABLE public.memberships
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- =====================================================
-- 3. UPDATE EXISTING ROWS
-- =====================================================

-- Set all existing memberships to active
UPDATE public.memberships
SET is_active = true
WHERE is_active IS NULL;

-- =====================================================
-- 4. VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=================================';
    RAISE NOTICE 'MEMBERSHIPS COLUMNS ADDED!';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Added columns:';
    RAISE NOTICE '  - description (TEXT)';
    RAISE NOTICE '  - is_active (BOOLEAN, default: true)';
    RAISE NOTICE 'All existing memberships set to active';
    RAISE NOTICE '=================================';
END $$;
