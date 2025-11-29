-- schema.sql
-- This script sets up the database schema for the Power Ultra Gym application,
-- including tables for memberships, user profiles, classes, schedules, bookings,
-- and contact submissions. It is designed for use with Supabase and integrates
-- with Supabase Auth.

-- 1. MEMBERSHIPS TABLE
-- Stores the different membership plans available.
CREATE TABLE public.memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    price numeric NOT NULL,
    duration_months integer NOT NULL,
    features text[]
);

-- 2. PROFILES TABLE
-- Stores public user information. This table has a one-to-one relationship
-- with the `auth.users` table, linked by the user's ID.
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    membership_id uuid REFERENCES public.memberships(id),
    membership_expiry_date date,
    updated_at timestamp with time zone DEFAULT now()
);

-- Helper function to automatically update `updated_at` timestamps.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update `updated_at` on profile changes.
CREATE TRIGGER on_profile_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();


-- 3. CLASSES TABLE
-- Stores details about each fitness class offered.
CREATE TABLE public.classes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    instructor text,
    image_url text
);

-- 4. SCHEDULE TABLE
-- Defines the weekly schedule for classes.
CREATE TABLE public.schedule (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    day_of_week text NOT NULL CHECK (day_of_week IN ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
    start_time time NOT NULL,
    end_time time NOT NULL,
    max_capacity integer DEFAULT 20
);

-- 5. BOOKINGS TABLE
-- Tracks user bookings for specific classes in the schedule.
CREATE TABLE public.bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    schedule_id uuid NOT NULL REFERENCES public.schedule(id) ON DELETE CASCADE,
    booking_date timestamp with time zone DEFAULT now(),
    CONSTRAINT unique_booking UNIQUE (user_id, schedule_id) -- Prevents duplicate bookings for the same class by the same user.
);

-- 6. CONTACT SUBMISSIONS TABLE
-- Stores messages from the contact form.
CREATE TABLE public.contact_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    message text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now()
);


-- 7. ROW-LEVEL SECURITY (RLS) POLICIES
-- Enable RLS for all tables.
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR `profiles`
-- Users can view their own profile.
CREATE POLICY "Allow individual user read access on profiles"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile.
CREATE POLICY "Allow individual user update access on profiles"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- POLICIES FOR `bookings`
-- Users can view their own bookings.
CREATE POLICY "Allow individual user read access on bookings"
ON public.bookings FOR SELECT
USING (auth.uid() = user_id);

-- Users can create bookings for themselves.
CREATE POLICY "Allow individual user insert access on bookings"
ON public.bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bookings.
CREATE POLICY "Allow individual user delete access on bookings"
ON public.bookings FOR DELETE
USING (auth.uid() = user_id);

-- POLICIES FOR PUBLICLY READABLE DATA
-- Anyone can view memberships, classes, and the schedule.
CREATE POLICY "Allow public read access on memberships"
ON public.memberships FOR SELECT
USING (true);

CREATE POLICY "Allow public read access on classes"
ON public.classes FOR SELECT
USING (true);

CREATE POLICY "Allow public read access on schedule"
ON public.schedule FOR SELECT
USING (true);

-- POLICY FOR `contact_submissions`
-- Anyone can submit the contact form.
CREATE POLICY "Allow anonymous insert on contact_submissions"
ON public.contact_submissions FOR INSERT
WITH CHECK (true);

-- NOTE: By default, SELECT, UPDATE, and DELETE on `contact_submissions` are
-- denied for all users. You should create specific policies for admin roles
-- if you need to read or manage these submissions from the app.
-- Example for an admin role (you would need to implement this role):
-- CREATE POLICY "Allow admin read access on contact_submissions"
-- ON public.contact_submissions FOR SELECT
-- USING (is_admin(auth.uid()));
