-- add_server_validation.sql
-- This script adds server-side validation functions and constraints
-- to enhance data integrity and security

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

-- 6. ADD EMAIL VALIDATION TO CONTACT SUBMISSIONS
ALTER TABLE public.contact_submissions
ADD CONSTRAINT valid_email CHECK (is_valid_email(email));

-- 7. ADD EMAIL CONSTRAINT TO PROFILES (if email field exists)
-- Note: profiles table uses auth.users email, but we can add validation for any custom email field

-- 8. VALIDATE SCHEDULE TIMES (end_time must be after start_time)
ALTER TABLE public.schedule
ADD CONSTRAINT valid_time_range CHECK (end_time > start_time);

-- 9. ENSURE POSITIVE CAPACITY
ALTER TABLE public.schedule
ADD CONSTRAINT positive_capacity CHECK (max_capacity > 0);

-- 10. ENSURE POSITIVE PRICING
ALTER TABLE public.memberships
ADD CONSTRAINT positive_price CHECK (price >= 0);

-- 11. ENSURE POSITIVE DURATION
ALTER TABLE public.memberships
ADD CONSTRAINT positive_duration CHECK (duration_months > 0);

-- 12. ADD MEMBERSHIP INQUIRIES TABLE (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.membership_inquiries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL CHECK (is_valid_email(email)),
    phone text,
    membership_id uuid REFERENCES public.memberships(id),
    submitted_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for membership inquiries
ALTER TABLE public.membership_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an inquiry
CREATE POLICY "Allow anonymous insert on membership_inquiries"
ON public.membership_inquiries FOR INSERT
WITH CHECK (true);

-- 13. ADD PHONE AND EMAIL FIELDS TO PROFILES IF NOT EXISTS
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

-- 14. ADD VALIDATION FOR PROFILE EMAIL AND PHONE
DO $$
BEGIN
    -- Add email validation constraint if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='profiles' AND column_name='email') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS valid_profile_email;
        ALTER TABLE public.profiles
        ADD CONSTRAINT valid_profile_email
        CHECK (email IS NULL OR is_valid_email(email));
    END IF;

    -- Add phone validation constraint if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name='profiles' AND column_name='phone') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS valid_profile_phone;
        ALTER TABLE public.profiles
        ADD CONSTRAINT valid_profile_phone
        CHECK (phone IS NULL OR is_valid_phone(phone));
    END IF;
END $$;

-- 15. ADD PHONE VALIDATION TO MEMBERSHIP INQUIRIES
ALTER TABLE public.membership_inquiries DROP CONSTRAINT IF EXISTS valid_inquiry_phone;
ALTER TABLE public.membership_inquiries
ADD CONSTRAINT valid_inquiry_phone
CHECK (phone IS NULL OR is_valid_phone(phone));

-- 16. ADD CREATED_AT TIMESTAMP TO BOOKINGS IF NOT EXISTS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='bookings' AND column_name='created_at') THEN
        ALTER TABLE public.bookings ADD COLUMN created_at timestamp with time zone DEFAULT now();
    END IF;
END $$;

-- 17. FUNCTION TO GET BOOKING COUNT FOR A SCHEDULE
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

-- 18. FUNCTION TO GET AVAILABLE SPOTS FOR A SCHEDULE
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

COMMENT ON FUNCTION public.is_valid_email IS 'Validates email format using regex';
COMMENT ON FUNCTION public.is_valid_phone IS 'Validates phone number (minimum 10 digits)';
COMMENT ON FUNCTION public.has_active_membership IS 'Checks if a user has an active, non-expired membership';
COMMENT ON FUNCTION public.is_class_full IS 'Checks if a class schedule has reached maximum capacity';
COMMENT ON FUNCTION public.validate_booking IS 'Validates bookings before insertion (membership + capacity checks)';
COMMENT ON FUNCTION public.get_booking_count IS 'Returns the number of bookings for a given schedule';
COMMENT ON FUNCTION public.get_available_spots IS 'Returns the number of available spots for a given schedule';
