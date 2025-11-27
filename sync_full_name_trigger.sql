-- Automatically sync full_name when first_name or last_name changes
-- This ensures full_name is always up-to-date

-- =====================================================
-- 1. CREATE FUNCTION TO UPDATE FULL_NAME
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_full_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Construct full_name from first_name and last_name
  NEW.full_name := TRIM(CONCAT(NEW.first_name, ' ', NEW.last_name));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. CREATE TRIGGER ON PROFILES TABLE
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_full_name_trigger ON public.profiles;

-- Create trigger that fires before INSERT or UPDATE
CREATE TRIGGER sync_full_name_trigger
BEFORE INSERT OR UPDATE OF first_name, last_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_full_name();

-- =====================================================
-- 3. UPDATE EXISTING ROWS
-- =====================================================

-- Update all existing profiles that have first_name and last_name but missing full_name
UPDATE public.profiles
SET full_name = TRIM(CONCAT(first_name, ' ', last_name))
WHERE (full_name IS NULL OR full_name = '')
  AND (first_name IS NOT NULL OR last_name IS NOT NULL);

-- =====================================================
-- 4. VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=================================';
    RAISE NOTICE 'FULL_NAME SYNC CONFIGURED!';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Trigger created: sync_full_name_trigger';
    RAISE NOTICE 'Function created: sync_full_name()';
    RAISE NOTICE 'Existing profiles updated';
    RAISE NOTICE 'full_name will now auto-update when first_name or last_name changes';
    RAISE NOTICE '=================================';
END $$;
