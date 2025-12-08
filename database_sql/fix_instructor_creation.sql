-- =====================================================
-- FIX: Enable Instructor Creation from Existing Users
-- =====================================================
-- This script creates functions to promote users to instructors
-- and provides the missing link between profiles and instructors tables

-- =====================================================
-- 1. Function: Promote User to Instructor
-- =====================================================

CREATE OR REPLACE FUNCTION promote_user_to_instructor(
  p_user_id uuid,
  p_name text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_is_personal_trainer boolean DEFAULT false,
  p_specializations text[] DEFAULT NULL,
  p_certifications text[] DEFAULT NULL,
  p_max_clients integer DEFAULT 15,
  p_hourly_rate numeric(10,2) DEFAULT NULL,
  p_years_experience integer DEFAULT NULL
)
RETURNS TABLE (
  instructor_id uuid,
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_instructor_id uuid;
  user_full_name text;
  user_email text;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Only admins can create instructors';
    RETURN;
  END IF;

  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN QUERY SELECT NULL::uuid, false, 'User does not exist';
    RETURN;
  END IF;

  -- Check if user already has an instructor record
  IF EXISTS (SELECT 1 FROM instructors WHERE user_id = p_user_id) THEN
    SELECT id INTO new_instructor_id FROM instructors WHERE user_id = p_user_id;
    RETURN QUERY SELECT new_instructor_id, false, 'User is already an instructor';
    RETURN;
  END IF;

  -- Get user details if not provided
  SELECT full_name, email INTO user_full_name, user_email
  FROM profiles WHERE id = p_user_id;

  -- Create instructor record
  INSERT INTO instructors (
    user_id,
    name,
    bio,
    email,
    phone,
    is_personal_trainer,
    specializations,
    certifications,
    max_clients,
    hourly_rate,
    years_experience,
    is_active
  ) VALUES (
    p_user_id,
    COALESCE(p_name, user_full_name, 'Instructor'),
    p_bio,
    COALESCE(p_email, user_email),
    p_phone,
    p_is_personal_trainer,
    p_specializations,
    p_certifications,
    COALESCE(p_max_clients, 15),
    p_hourly_rate,
    p_years_experience,
    true
  )
  RETURNING id INTO new_instructor_id;

  -- Log the action (if log_admin_action function exists)
  BEGIN
    PERFORM log_admin_action(
      'PROMOTE_TO_INSTRUCTOR',
      'instructors',
      new_instructor_id,
      NULL,
      jsonb_build_object(
        'user_id', p_user_id,
        'is_personal_trainer', p_is_personal_trainer,
        'name', COALESCE(p_name, user_full_name)
      )
    );
  EXCEPTION
    WHEN undefined_function THEN
      -- log_admin_action doesn't exist, skip logging
      NULL;
  END;

  RETURN QUERY SELECT new_instructor_id, true, 'Instructor created successfully';
END;
$$;

COMMENT ON FUNCTION promote_user_to_instructor IS 'Promotes an existing user to instructor status. Only admins can call this.';

-- =====================================================
-- 2. Function: Deactivate Instructor
-- =====================================================

CREATE OR REPLACE FUNCTION deactivate_instructor(p_instructor_id uuid)
RETURNS TABLE (
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RETURN QUERY SELECT false, 'Only admins can deactivate instructors';
    RETURN;
  END IF;

  -- Check if instructor exists
  IF NOT EXISTS (SELECT 1 FROM instructors WHERE id = p_instructor_id) THEN
    RETURN QUERY SELECT false, 'Instructor not found';
    RETURN;
  END IF;

  -- Check if instructor has active assignments (if trainer_assignments table exists)
  BEGIN
    IF EXISTS (
      SELECT 1 FROM trainer_assignments
      WHERE trainer_id = p_instructor_id AND status = 'active'
    ) THEN
      RETURN QUERY SELECT false, 'Cannot deactivate instructor with active client assignments. Please reassign or complete assignments first.';
      RETURN;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      -- trainer_assignments doesn't exist yet, skip this check
      NULL;
  END;

  -- Soft delete by setting is_active = false
  UPDATE instructors
  SET is_active = false,
      updated_at = now()
  WHERE id = p_instructor_id;

  -- Log the action (if log_admin_action function exists)
  BEGIN
    PERFORM log_admin_action(
      'DEACTIVATE_INSTRUCTOR',
      'instructors',
      p_instructor_id,
      NULL,
      NULL
    );
  EXCEPTION
    WHEN undefined_function THEN
      NULL;
  END;

  RETURN QUERY SELECT true, 'Instructor deactivated successfully';
END;
$$;

COMMENT ON FUNCTION deactivate_instructor IS 'Deactivates an instructor (soft delete). Only admins can call this.';

-- =====================================================
-- 3. Function: Reactivate Instructor
-- =====================================================

CREATE OR REPLACE FUNCTION reactivate_instructor(p_instructor_id uuid)
RETURNS TABLE (
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RETURN QUERY SELECT false, 'Only admins can reactivate instructors';
    RETURN;
  END IF;

  -- Check if instructor exists
  IF NOT EXISTS (SELECT 1 FROM instructors WHERE id = p_instructor_id) THEN
    RETURN QUERY SELECT false, 'Instructor not found';
    RETURN;
  END IF;

  -- Reactivate
  UPDATE instructors
  SET is_active = true,
      updated_at = now()
  WHERE id = p_instructor_id;

  -- Log the action
  BEGIN
    PERFORM log_admin_action(
      'REACTIVATE_INSTRUCTOR',
      'instructors',
      p_instructor_id,
      NULL,
      NULL
    );
  EXCEPTION
    WHEN undefined_function THEN
      NULL;
  END;

  RETURN QUERY SELECT true, 'Instructor reactivated successfully';
END;
$$;

COMMENT ON FUNCTION reactivate_instructor IS 'Reactivates a deactivated instructor. Only admins can call this.';

-- =====================================================
-- 4. Function: Get Users Who Are Not Instructors
-- =====================================================

CREATE OR REPLACE FUNCTION get_non_instructor_users()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can view this data';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.updated_at
  FROM profiles p
  LEFT JOIN instructors i ON p.id = i.user_id
  WHERE i.id IS NULL  -- No instructor record exists
    AND p.is_admin = false  -- Not an admin
  ORDER BY p.full_name;
END;
$$;

COMMENT ON FUNCTION get_non_instructor_users IS 'Returns all users who are not yet instructors. Only admins can call this.';

-- =====================================================
-- 5. Function: Update Instructor Details
-- =====================================================

CREATE OR REPLACE FUNCTION update_instructor_details(
  p_instructor_id uuid,
  p_name text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_specializations text[] DEFAULT NULL,
  p_certifications text[] DEFAULT NULL,
  p_max_clients integer DEFAULT NULL,
  p_hourly_rate numeric(10,2) DEFAULT NULL,
  p_years_experience integer DEFAULT NULL
)
RETURNS TABLE (
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RETURN QUERY SELECT false, 'Only admins can update instructor details';
    RETURN;
  END IF;

  -- Check if instructor exists
  IF NOT EXISTS (SELECT 1 FROM instructors WHERE id = p_instructor_id) THEN
    RETURN QUERY SELECT false, 'Instructor not found';
    RETURN;
  END IF;

  -- Update only provided fields
  UPDATE instructors
  SET
    name = COALESCE(p_name, name),
    bio = COALESCE(p_bio, bio),
    email = COALESCE(p_email, email),
    phone = COALESCE(p_phone, phone),
    specializations = COALESCE(p_specializations, specializations),
    certifications = COALESCE(p_certifications, certifications),
    max_clients = COALESCE(p_max_clients, max_clients),
    hourly_rate = COALESCE(p_hourly_rate, hourly_rate),
    years_experience = COALESCE(p_years_experience, years_experience),
    updated_at = now()
  WHERE id = p_instructor_id;

  -- Log the action
  BEGIN
    PERFORM log_admin_action(
      'UPDATE_INSTRUCTOR',
      'instructors',
      p_instructor_id,
      NULL,
      jsonb_build_object(
        'name', p_name,
        'bio', p_bio,
        'specializations', p_specializations
      )
    );
  EXCEPTION
    WHEN undefined_function THEN
      NULL;
  END;

  RETURN QUERY SELECT true, 'Instructor details updated successfully';
END;
$$;

COMMENT ON FUNCTION update_instructor_details IS 'Updates instructor details. Only admins can call this.';

-- =====================================================
-- 6. Grant Permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION promote_user_to_instructor TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_instructor TO authenticated;
GRANT EXECUTE ON FUNCTION reactivate_instructor TO authenticated;
GRANT EXECUTE ON FUNCTION get_non_instructor_users TO authenticated;
GRANT EXECUTE ON FUNCTION update_instructor_details TO authenticated;

-- =====================================================
-- 7. Verify RLS Policies
-- =====================================================

DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'instructors'
  AND (
    policyname LIKE '%admin%'
    OR policyname LIKE '%public%'
  );

  IF policy_count = 0 THEN
    RAISE WARNING 'No RLS policies found on instructors table!';
    RAISE WARNING 'Please run admin_schema.sql to create proper policies';
  ELSE
    RAISE NOTICE 'RLS policies verified: % policies found on instructors table', policy_count;
  END IF;
END $$;

-- =====================================================
-- 8. Success Message & Usage Examples
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'INSTRUCTOR CREATION FUNCTIONS INSTALLED!';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  ✓ promote_user_to_instructor()';
  RAISE NOTICE '  ✓ deactivate_instructor()';
  RAISE NOTICE '  ✓ reactivate_instructor()';
  RAISE NOTICE '  ✓ get_non_instructor_users()';
  RAISE NOTICE '  ✓ update_instructor_details()';
  RAISE NOTICE '';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'USAGE EXAMPLES:';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. Get users who can be promoted:';
  RAISE NOTICE '   SELECT * FROM get_non_instructor_users();';
  RAISE NOTICE '';
  RAISE NOTICE '2. Promote user to instructor:';
  RAISE NOTICE '   SELECT * FROM promote_user_to_instructor(';
  RAISE NOTICE '     ''<user-uuid>'',';
  RAISE NOTICE '     ''John Doe'',                          -- name';
  RAISE NOTICE '     ''Certified personal trainer...'',     -- bio';
  RAISE NOTICE '     ''john@example.com'',                  -- email';
  RAISE NOTICE '     ''555-1234'',                          -- phone';
  RAISE NOTICE '     true,                                  -- is_personal_trainer';
  RAISE NOTICE '     ARRAY[''Strength'', ''Cardio''],       -- specializations';
  RAISE NOTICE '     ARRAY[''NASM-CPT'', ''ACE'']           -- certifications';
  RAISE NOTICE '   );';
  RAISE NOTICE '';
  RAISE NOTICE '3. Deactivate instructor:';
  RAISE NOTICE '   SELECT * FROM deactivate_instructor(''<instructor-uuid>'');';
  RAISE NOTICE '';
  RAISE NOTICE '4. Reactivate instructor:';
  RAISE NOTICE '   SELECT * FROM reactivate_instructor(''<instructor-uuid>'');';
  RAISE NOTICE '';
  RAISE NOTICE '5. Update instructor details:';
  RAISE NOTICE '   SELECT * FROM update_instructor_details(';
  RAISE NOTICE '     ''<instructor-uuid>'',';
  RAISE NOTICE '     ''New Name'',';
  RAISE NOTICE '     ''Updated bio...''';
  RAISE NOTICE '   );';
  RAISE NOTICE '';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '1. Test: SELECT * FROM get_non_instructor_users();';
  RAISE NOTICE '2. Create admin UI component to call these functions';
  RAISE NOTICE '3. Add "Promote to Instructor" button in admin panel';
  RAISE NOTICE '=================================================';
END $$;
