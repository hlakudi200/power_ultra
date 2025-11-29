-- add_server_validation_fixed.sql
-- This script adds server-side validation functions and constraints
-- FIXED VERSION: Handles existing data and applies constraints safely

-- 1. EMAIL VALIDATION FUNCTION
CREATE OR REPLACE FUNCTION public.is_valid_email(email text)
RETURNS boolean AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. PHONE VALIDATION FUNCTION (supports various formats)
CREATE OR REPLACE FUNCTION public.is_valid_phone(phone text)
RETURNS boolean AS $$
BEGIN
    -- Remove all non-digit characters for validation
    RETURN length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 10;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. CHECK IF USER HAS ACTIVE MEMBERSHIP
CREATE OR REPLACE FUNCTION public.has_active_membership(user_id uuid)
RETURNS boolean AS $$
DECLARE
    expiry_date date;
BEGIN
    SELECT membership_expiry_date INTO expiry_date
    FROM public.profiles
    WHERE id = user_id;

    RETURN expiry_date IS NOT NULL AND expiry_date >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. CHECK IF CLASS IS AT CAPACITY
CREATE OR REPLACE FUNCTION public.is_class_full(schedule_id_param uuid)
RETURNS boolean AS $$
DECLARE
    current_bookings integer;
    max_cap integer;
BEGIN
    -- Get the max capacity for this schedule
    SELECT max_capacity INTO max_cap
    FROM public.schedule
    WHERE id = schedule_id_param;

    -- Count current bookings
    SELECT COUNT(*) INTO current_bookings
    FROM public.bookings
    WHERE schedule_id = schedule_id_param;

    RETURN current_bookings >= max_cap;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. VALIDATE BOOKING BEFORE INSERT
CREATE OR REPLACE FUNCTION public.validate_booking()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user has active membership
    IF NOT public.has_active_membership(NEW.user_id) THEN
        RAISE EXCEPTION 'User must have an active membership to book classes';
    END IF;

    -- Check if class is full
    IF public.is_class_full(NEW.schedule_id) THEN
        RAISE EXCEPTION 'This class is already at full capacity';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the booking validation trigger
DROP TRIGGER IF EXISTS validate_booking_trigger ON public.bookings;
CREATE TRIGGER validate_booking_trigger
BEFORE INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.validate_booking();

-- 6. CLEAN UP INVALID DATA BEFORE ADDING CONSTRAINTS
-- Fix invalid emails in contact_submissions
UPDATE public.contact_submissions
SET email = LOWER(TRIM(email))
WHERE email IS NOT NULL;

-- Delete rows with completely invalid emails (optional - comment out if you want to keep data)
-- DELETE FROM public.contact_submissions
-- WHERE email IS NOT NULL AND NOT is_valid_email(email);

-- 7. ADD EMAIL VALIDATION TO CONTACT SUBMISSIONS (only for valid data)
DO $$
BEGIN
    -- Drop the constraint if it exists
    ALTER TABLE public.contact_submissions DROP CONSTRAINT IF EXISTS valid_email;

    -- Only add constraint if all existing data is valid
    IF NOT EXISTS (
        SELECT 1 FROM public.contact_submissions
        WHERE email IS NOT NULL AND NOT is_valid_email(email)
    ) THEN
        ALTER TABLE public.contact_submissions
        ADD CONSTRAINT valid_email CHECK (is_valid_email(email));
    ELSE
        RAISE NOTICE 'Some contact_submissions have invalid emails. Constraint not added. Please clean data first.';
    END IF;
END $$;

-- 8. VALIDATE SCHEDULE TIMES (end_time must be after start_time)
DO $$
BEGIN
    ALTER TABLE public.schedule DROP CONSTRAINT IF EXISTS valid_time_range;
    ALTER TABLE public.schedule
    ADD CONSTRAINT valid_time_range CHECK (end_time > start_time);
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'Some schedules have invalid time ranges. Please fix data first.';
END $$;

-- 9. ENSURE POSITIVE CAPACITY
DO $$
BEGIN
    ALTER TABLE public.schedule DROP CONSTRAINT IF EXISTS positive_capacity;
    ALTER TABLE public.schedule
    ADD CONSTRAINT positive_capacity CHECK (max_capacity > 0);
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'Some schedules have invalid capacity. Please fix data first.';
END $$;

-- 10. ENSURE POSITIVE PRICING
DO $$
BEGIN
    ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS positive_price;
    ALTER TABLE public.memberships
    ADD CONSTRAINT positive_price CHECK (price >= 0);
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'Some memberships have negative prices. Please fix data first.';
END $$;

-- 11. ENSURE POSITIVE DURATION
DO $$
BEGIN
    ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS positive_duration;
    ALTER TABLE public.memberships
    ADD CONSTRAINT positive_duration CHECK (duration_months > 0);
EXCEPTION
    WHEN check_violation THEN
        RAISE NOTICE 'Some memberships have invalid duration. Please fix data first.';
END $$;

-- 12. CREATE MEMBERSHIP INQUIRIES TABLE IF IT DOESN'T EXIST
CREATE TABLE IF NOT EXISTS public.membership_inquiries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    membership_id uuid REFERENCES public.memberships(id),
    submitted_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for membership inquiries
ALTER TABLE public.membership_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an inquiry
DROP POLICY IF EXISTS "Allow anonymous insert on membership_inquiries" ON public.membership_inquiries;
CREATE POLICY "Allow anonymous insert on membership_inquiries"
ON public.membership_inquiries FOR INSERT
WITH CHECK (true);

-- 13. CLEAN INVALID DATA IN MEMBERSHIP INQUIRIES
-- Update emails to be lowercase and trimmed
UPDATE public.membership_inquiries
SET email = LOWER(TRIM(email))
WHERE email IS NOT NULL;

-- Clean phone numbers - set NULL if empty or just whitespace
UPDATE public.membership_inquiries
SET phone = NULL
WHERE phone IS NOT NULL AND TRIM(phone) = '';

-- Update phone to remove spaces/dashes for validation
UPDATE public.membership_inquiries
SET phone = regexp_replace(phone, '[^0-9+]', '', 'g')
WHERE phone IS NOT NULL;

-- Set phone to NULL if less than 10 digits (invalid)
UPDATE public.membership_inquiries
SET phone = NULL
WHERE phone IS NOT NULL AND length(regexp_replace(phone, '[^0-9]', '', 'g')) < 10;

-- 14. ADD EMAIL VALIDATION TO MEMBERSHIP INQUIRIES
DO $$
BEGIN
    ALTER TABLE public.membership_inquiries DROP CONSTRAINT IF EXISTS valid_inquiry_email;

    IF NOT EXISTS (
        SELECT 1 FROM public.membership_inquiries
        WHERE email IS NOT NULL AND NOT is_valid_email(email)
    ) THEN
        ALTER TABLE public.membership_inquiries
        ADD CONSTRAINT valid_inquiry_email CHECK (is_valid_email(email));
    ELSE
        RAISE NOTICE 'Some membership_inquiries have invalid emails. Please review data.';
    END IF;
END $$;

-- 15. ADD PHONE VALIDATION TO MEMBERSHIP INQUIRIES (only for non-null values)
DO $$
BEGIN
    ALTER TABLE public.membership_inquiries DROP CONSTRAINT IF EXISTS valid_inquiry_phone;

    -- Check if there's any invalid phone data
    IF NOT EXISTS (
        SELECT 1 FROM public.membership_inquiries
        WHERE phone IS NOT NULL AND NOT is_valid_phone(phone)
    ) THEN
        ALTER TABLE public.membership_inquiries
        ADD CONSTRAINT valid_inquiry_phone
        CHECK (phone IS NULL OR is_valid_phone(phone));
        RAISE NOTICE 'Phone validation constraint added successfully to membership_inquiries';
    ELSE
        RAISE NOTICE 'Some membership_inquiries have invalid phone numbers. Data has been cleaned, but please verify.';
        -- Show the invalid entries
        RAISE NOTICE 'Invalid phone entries: %', (
            SELECT COUNT(*) FROM public.membership_inquiries
            WHERE phone IS NOT NULL AND NOT is_valid_phone(phone)
        );
    END IF;
END $$;

-- 16. ADD PHONE AND EMAIL FIELDS TO PROFILES IF NOT EXISTS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='profiles' AND column_name='email') THEN
        ALTER TABLE public.profiles ADD COLUMN email text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='profiles' AND column_name='phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='profiles' AND column_name='first_name') THEN
        ALTER TABLE public.profiles ADD COLUMN first_name text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='profiles' AND column_name='last_name') THEN
        ALTER TABLE public.profiles ADD COLUMN last_name text;
    END IF;
END $$;

-- 17. CLEAN AND VALIDATE PROFILE DATA
UPDATE public.profiles
SET email = LOWER(TRIM(email))
WHERE email IS NOT NULL;

UPDATE public.profiles
SET phone = NULL
WHERE phone IS NOT NULL AND TRIM(phone) = '';

UPDATE public.profiles
SET phone = regexp_replace(phone, '[^0-9+]', '', 'g')
WHERE phone IS NOT NULL;

UPDATE public.profiles
SET phone = NULL
WHERE phone IS NOT NULL AND length(regexp_replace(phone, '[^0-9]', '', 'g')) < 10;

-- 18. ADD VALIDATION FOR PROFILE EMAIL AND PHONE
DO $$
BEGIN
    -- Add email validation constraint if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='profiles' AND column_name='email') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS valid_profile_email;

        IF NOT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE email IS NOT NULL AND NOT is_valid_email(email)
        ) THEN
            ALTER TABLE public.profiles
            ADD CONSTRAINT valid_profile_email
            CHECK (email IS NULL OR is_valid_email(email));
        END IF;
    END IF;

    -- Add phone validation constraint if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='profiles' AND column_name='phone') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS valid_profile_phone;

        IF NOT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE phone IS NOT NULL AND NOT is_valid_phone(phone)
        ) THEN
            ALTER TABLE public.profiles
            ADD CONSTRAINT valid_profile_phone
            CHECK (phone IS NULL OR is_valid_phone(phone));
        END IF;
    END IF;
END $$;

-- 19. ADD CREATED_AT TIMESTAMP TO BOOKINGS IF NOT EXISTS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='bookings' AND column_name='created_at') THEN
        ALTER TABLE public.bookings ADD COLUMN created_at timestamp with time zone DEFAULT now();
    END IF;
END $$;

-- 20. HELPER FUNCTIONS FOR GETTING BOOKING STATS
CREATE OR REPLACE FUNCTION public.get_booking_count(schedule_id_param uuid)
RETURNS integer AS $$
DECLARE
    booking_count integer;
BEGIN
    SELECT COUNT(*) INTO booking_count
    FROM public.bookings
    WHERE schedule_id = schedule_id_param;

    RETURN booking_count;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION public.get_available_spots(schedule_id_param uuid)
RETURNS integer AS $$
DECLARE
    max_cap integer;
    current_bookings integer;
BEGIN
    SELECT max_capacity INTO max_cap
    FROM public.schedule
    WHERE id = schedule_id_param;

    SELECT COUNT(*) INTO current_bookings
    FROM public.bookings
    WHERE schedule_id = schedule_id_param;

    RETURN GREATEST(max_cap - current_bookings, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- 21. ADD COMMENTS TO FUNCTIONS
COMMENT ON FUNCTION public.is_valid_email IS 'Validates email format using regex';
COMMENT ON FUNCTION public.is_valid_phone IS 'Validates phone number (minimum 10 digits)';
COMMENT ON FUNCTION public.has_active_membership IS 'Checks if a user has an active, non-expired membership';
COMMENT ON FUNCTION public.is_class_full IS 'Checks if a class schedule has reached maximum capacity';
COMMENT ON FUNCTION public.validate_booking IS 'Validates bookings before insertion (membership + capacity checks)';
COMMENT ON FUNCTION public.get_booking_count IS 'Returns the number of bookings for a given schedule';
COMMENT ON FUNCTION public.get_available_spots IS 'Returns the number of available spots for a given schedule';

-- 22. DISPLAY SUMMARY
DO $$
DECLARE
    invalid_inquiry_phones integer;
    invalid_contact_emails integer;
    invalid_profile_emails integer;
    invalid_profile_phones integer;
BEGIN
    -- Check for remaining invalid data
    SELECT COUNT(*) INTO invalid_inquiry_phones
    FROM public.membership_inquiries
    WHERE phone IS NOT NULL AND NOT is_valid_phone(phone);

    SELECT COUNT(*) INTO invalid_contact_emails
    FROM public.contact_submissions
    WHERE email IS NOT NULL AND NOT is_valid_email(email);

    SELECT COUNT(*) INTO invalid_profile_emails
    FROM public.profiles
    WHERE email IS NOT NULL AND NOT is_valid_email(email);

    SELECT COUNT(*) INTO invalid_profile_phones
    FROM public.profiles
    WHERE phone IS NOT NULL AND NOT is_valid_phone(phone);

    RAISE NOTICE '=== VALIDATION SETUP COMPLETE ===';
    RAISE NOTICE 'Invalid data remaining:';
    RAISE NOTICE '  - Membership inquiry phones: %', invalid_inquiry_phones;
    RAISE NOTICE '  - Contact emails: %', invalid_contact_emails;
    RAISE NOTICE '  - Profile emails: %', invalid_profile_emails;
    RAISE NOTICE '  - Profile phones: %', invalid_profile_phones;

    IF invalid_inquiry_phones > 0 OR invalid_contact_emails > 0 OR
       invalid_profile_emails > 0 OR invalid_profile_phones > 0 THEN
        RAISE NOTICE 'Some constraints may not be applied due to invalid data.';
        RAISE NOTICE 'Invalid data has been set to NULL where possible.';
    ELSE
        RAISE NOTICE 'All validation constraints applied successfully!';
    END IF;
END $$;
