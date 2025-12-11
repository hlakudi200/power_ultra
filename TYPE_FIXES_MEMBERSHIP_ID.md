# Type Fixes: membership_id Integer → UUID

## Issue

The initial migration script used `integer` for `membership_id` foreign keys, but the actual `memberships` table in the schema uses `uuid` as the primary key.

**Error:**
```
ERROR: 42804: foreign key constraint "membership_activation_codes_membership_id_fkey" cannot be implemented
DETAIL: Key columns "membership_id" and "id" are of incompatible types: integer and uuid.
```

---

## Root Cause

Looking at [database_sql/schema2.sql](database_sql/schema2.sql#L122-L133):

```sql
CREATE TABLE public.memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),  -- ← UUID, not integer
  name text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0::numeric),
  duration_months integer NOT NULL CHECK (duration_months > 0),
  features ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  description text,
  is_active boolean DEFAULT true,
  CONSTRAINT memberships_pkey PRIMARY KEY (id)
);
```

The `memberships.id` is **UUID**, not integer.

---

## Files Fixed

### 1. Database Migration: [database_sql/add_membership_activation_codes.sql](database_sql/add_membership_activation_codes.sql)

#### Line 25: Table Definition
**Before:**
```sql
membership_id integer NOT NULL REFERENCES memberships(id),
```

**After:**
```sql
membership_id uuid NOT NULL REFERENCES memberships(id),
```

#### Line 59: generate_activation_code Function
**Before:**
```sql
CREATE OR REPLACE FUNCTION generate_activation_code(
  p_membership_id integer,
  ...
)
```

**After:**
```sql
CREATE OR REPLACE FUNCTION generate_activation_code(
  p_membership_id uuid,
  ...
)
```

#### Line 238: admin_activate_membership Function
**Before:**
```sql
CREATE OR REPLACE FUNCTION admin_activate_membership(
  p_user_id uuid,
  p_membership_id integer,
  ...
)
```

**After:**
```sql
CREATE OR REPLACE FUNCTION admin_activate_membership(
  p_user_id uuid,
  p_membership_id uuid,
  ...
)
```

#### Line 347: profiles.current_membership_id Column
**Before:**
```sql
ADD COLUMN current_membership_id integer REFERENCES memberships(id);
```

**After:**
```sql
ADD COLUMN current_membership_id uuid REFERENCES memberships(id);
```

---

### 2. Frontend Component: [src/components/admin/QuickActivateMembershipDialog.tsx](src/components/admin/QuickActivateMembershipDialog.tsx)

#### Line 26: Membership Interface
**Before:**
```typescript
interface Membership {
  id: number;
  name: string;
  price: number;
  duration_months: number;
}
```

**After:**
```typescript
interface Membership {
  id: string;  // ← Changed from number to string (UUID)
  name: string;
  price: number;
  duration_months: number;
}
```

#### Line 108: RPC Call
**Before:**
```typescript
const { data, error } = await supabase.rpc("admin_activate_membership", {
  p_user_id: memberId,
  p_membership_id: parseInt(selectedMembershipId),  // ← Removed parseInt
  p_duration_months: customDuration ? parseInt(customDuration) : null,
  ...
});
```

**After:**
```typescript
const { data, error } = await supabase.rpc("admin_activate_membership", {
  p_user_id: memberId,
  p_membership_id: selectedMembershipId,  // ← Direct UUID string
  p_duration_months: customDuration ? parseInt(customDuration) : null,
  ...
});
```

#### Line 143: Find Selected Membership
**Before:**
```typescript
const selectedMembership = memberships.find(
  (m) => m.id === parseInt(selectedMembershipId)  // ← Removed parseInt
);
```

**After:**
```typescript
const selectedMembership = memberships.find(
  (m) => m.id === selectedMembershipId  // ← Direct string comparison
);
```

---

### 3. Edge Function: [supabase/functions/check-membership-expiry/index.ts](supabase/functions/check-membership-expiry/index.ts)

#### Line 30: Interface Definition
**Before:**
```typescript
interface ExpiringMembership {
  id: string;
  email: string;
  full_name: string;
  membership_expiry_date: string;
  current_membership_id: number;  // ← Was number
}
```

**After:**
```typescript
interface ExpiringMembership {
  id: string;
  email: string;
  full_name: string;
  membership_expiry_date: string;
  current_membership_id: string;  // ← Changed to string (UUID)
}
```

#### Line 103: Map Type
**Before:**
```typescript
const membershipMap = new Map<number, MembershipPlan>();
```

**After:**
```typescript
const membershipMap = new Map<string, MembershipPlan>();
```

---

## Summary of Changes

| Location | Field | Old Type | New Type |
|----------|-------|----------|----------|
| `membership_activation_codes` table | `membership_id` | `integer` | `uuid` |
| `generate_activation_code()` function | `p_membership_id` | `integer` | `uuid` |
| `admin_activate_membership()` function | `p_membership_id` | `integer` | `uuid` |
| `profiles` table | `current_membership_id` | `integer` | `uuid` |
| TypeScript `Membership` interface | `id` | `number` | `string` |
| TypeScript `ExpiringMembership` interface | `current_membership_id` | `number` | `string` |
| Frontend RPC call | `parseInt()` conversion | Used | Removed |
| Membership map | `Map<number, ...>` | Used | `Map<string, ...>` |

---

## Testing

After these fixes, the migration should run successfully:

```sql
-- Should now work without errors
\i database_sql/add_membership_activation_codes.sql
```

**Expected output:**
```
BEGIN
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
CREATE FUNCTION
CREATE FUNCTION
NOTICE:  ✓ Added current_membership_id column to profiles table
ALTER TABLE
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE FUNCTION
COMMIT
NOTICE:  ================================================
NOTICE:  MEMBERSHIP ACTIVATION CODE SYSTEM INSTALLED!
NOTICE:  ================================================
```

---

## Why UUID vs Integer?

The schema uses UUID for several reasons:

1. **Globally Unique:** UUIDs are unique across all tables and databases
2. **Security:** Harder to guess or enumerate than sequential integers
3. **Distributed Systems:** Can generate IDs client-side without coordination
4. **Supabase Default:** `gen_random_uuid()` is the default ID generation in Supabase

**Consistency:** Since other tables use UUID (profiles, classes, schedule, etc.), memberships also use UUID for consistency.

---

## Migration Path

If you already ran the old migration and have `integer` columns:

```sql
-- Drop the table if it was created with wrong type
DROP TABLE IF EXISTS public.membership_activation_codes CASCADE;

-- Drop the column if it was added
ALTER TABLE public.profiles DROP COLUMN IF EXISTS current_membership_id;

-- Now run the corrected migration
\i database_sql/add_membership_activation_codes.sql
```

---

## All Fixed! ✅

The membership activation system now correctly uses UUID throughout:
- Database foreign keys: UUID
- Function parameters: UUID
- TypeScript interfaces: string (UUID representation)
- Frontend comparisons: string equality (no parseInt)

This matches your existing schema and should work seamlessly with the rest of the application.
