# Membership Activation Feature

## Overview
Admins can now activate/deactivate membership plans. Inactive plans are hidden from users but remain visible in the admin panel.

## Changes Made

### 1. Database Changes
**File:** `add_memberships_columns.sql`

Added columns to `memberships` table:
- `description` (TEXT) - Optional description for membership plans
- `is_active` (BOOLEAN, default: true) - Controls whether plan is visible to users

### 2. Admin Panel
**File:** `src/pages/admin/Memberships.tsx`

Features:
- View all membership plans (active and inactive)
- Create new plans
- Edit existing plans
- **Activate/Deactivate** button for each plan
- Visual indicator (green badge) for active plans
- Inactive plans appear with reduced opacity

### 3. User-Facing Changes
**File:** `src/components/Pricing.tsx`

- Updated to only fetch and display **active** membership plans
- Users will no longer see deactivated plans
- Query filters: `.eq("is_active", true)`

## How It Works

### Admin View (All Plans)
```typescript
// Admin sees ALL plans (active and inactive)
const { data } = await supabase
  .from("memberships")
  .select("*")
  .order("price", { ascending: true });
```

### User View (Active Plans Only)
```typescript
// Users only see active plans
const { data } = await supabase
  .from("memberships")
  .select("*")
  .eq("is_active", true)  // Filter for active only
  .order("price", { ascending: true });
```

## Usage

### To Deactivate a Plan:
1. Go to Admin → Memberships
2. Find the plan you want to deactivate
3. Click the **"Deactivate"** button
4. The plan will:
   - Remain visible in admin panel (with reduced opacity)
   - Be immediately hidden from the public pricing page
   - No longer appear to users

### To Reactivate a Plan:
1. Go to Admin → Memberships
2. Find the inactive plan (shows with reduced opacity)
3. Click the **"Activate"** button
4. The plan will:
   - Show as active in admin panel (with green badge)
   - Immediately appear on the public pricing page
   - Be available for users to inquire about

## Benefits

1. **Seasonal Plans** - Deactivate plans during off-seasons
2. **Testing** - Create and test plans before making them public
3. **Temporary Removal** - Temporarily hide plans without deleting them
4. **Preserve Data** - Keep plan history and existing member assignments
5. **Quick Changes** - No database changes needed to hide/show plans

## Visual Indicators

### Admin Panel:
- **Active Plans**:
  - Green "Active" badge
  - Full opacity
  - Normal border
  - Can be deactivated

- **Inactive Plans**:
  - No badge
  - 60% opacity
  - Grayed out
  - Can be reactivated

### User Pricing Page:
- Only shows active plans
- No indication that other plans exist

## Database Schema

```sql
ALTER TABLE public.memberships
ADD COLUMN description TEXT,
ADD COLUMN is_active BOOLEAN DEFAULT true;
```

## Notes

- Deactivating a plan does **not** affect existing members with that plan
- Existing membership inquiries remain intact
- Plans can be activated/deactivated multiple times
- All existing plans default to `is_active = true`
