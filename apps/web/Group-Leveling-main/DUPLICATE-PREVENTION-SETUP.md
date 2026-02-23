# Duplicate User Prevention & Feedback System

## Overview

This system prevents duplicate user creation by enforcing unique constraints on:
- **name** (hunter name)
- **email** (email address)
- **strava_id** (Strava account ID)
- **auth_user_id** (Supabase Auth user ID)

It also provides detailed feedback to users when duplicates are detected.

---

## Architecture

### Signup Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER SIGNUP FLOW                          │
└─────────────────────────────────────────────────────────────┘

1. User submits onboarding form (name, email, strava_id)
   ↓
2. API checks for duplicates on ALL unique fields
   ↓
3a. If duplicate found:
    → Returns detailed error message
    → Shows existing user details
    → Offers login option
   
3b. If no duplicate:
    → Creates user in public.users
    → Returns success message with user details
    → User sees confirmation
```

### Database Constraints

All unique constraints are enforced at the database level:

```sql
-- Unique constraints (prevents duplicates even if API check fails)
UNIQUE (name)
UNIQUE (email)  
UNIQUE (strava_id)
UNIQUE (auth_user_id)
```

---

## Setup Instructions

### Step 1: Run SQL Script

Run `add-unique-constraints.sql` in your Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Paste the contents of `add-unique-constraints.sql`
4. Click "Run"

**Note**: If you have existing duplicates, the script will fail. Clean them up first:

```sql
-- Find duplicate names
SELECT name, COUNT(*) as count 
FROM public.users 
WHERE name IS NOT NULL 
GROUP BY name 
HAVING COUNT(*) > 1;

-- Find duplicate emails
SELECT email, COUNT(*) as count 
FROM public.users 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Find duplicate strava_ids
SELECT strava_id, COUNT(*) as count 
FROM public.users 
WHERE strava_id IS NOT NULL 
GROUP BY strava_id 
HAVING COUNT(*) > 1;
```

### Step 2: Test the System

1. Try creating a user with a duplicate name → Should show error
2. Try creating a user with a duplicate email → Should show error
3. Try creating a user with a duplicate strava_id → Should show error
4. Create a new user → Should show success message with details

---

## API Endpoints

### POST `/api/auth/onboarding`

**Request Body:**
```json
{
  "name": "Hunter Name",
  "email": "hunter@email.com",  // Optional
  "strava_id": 123456,           // Optional
  "gender": "Male",
  "avatar": "/avatar.png"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "Hunter Name",
    "email": "hunter@email.com",
    "strava_id": 123456,
    "status": "pending",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "Hunter \"Hunter Name\" has been awakened successfully!\n\nAccount Details:\n• Name: Hunter Name\n• Email: hunter@email.com\n• Strava ID: 123456\n• Status: pending\n• Created: 1/1/2024, 12:00:00 AM\n\nYour account is pending approval. An admin will review your application soon.",
  "details": {
    "name": "Hunter Name",
    "email": "hunter@email.com",
    "strava_id": 123456,
    "status": "pending",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Duplicate Error Response (409):**
```json
{
  "error": "Duplicate user detected",
  "message": "A hunter already exists with the same name.\n\nExisting Hunter Details:\n• Name: Existing Hunter\n• Email: existing@email.com\n• Strava ID: 123456\n• Status: approved\n• Created: 12/1/2023\n\nPlease use a different name or log in if this is your account.",
  "duplicateFields": ["name"],
  "existingUser": {
    "id": "uuid",
    "name": "Existing Hunter",
    "email": "existing@email.com",
    "strava_id": 123456,
    "status": "approved",
    "created_at": "2023-12-01T00:00:00Z"
  },
  "duplicates": [
    {
      "field": "name",
      "user": { /* user object */ }
    }
  ]
}
```

### POST `/api/admin/create-pending-user`

Same structure as onboarding, but requires admin authentication.

---

## User Feedback Messages

### Success Message

When a user is successfully created, they see:

```
Hunter "Hunter Name" has been awakened successfully!

Account Details:
• Name: Hunter Name
• Email: hunter@email.com
• Strava ID: 123456
• Status: pending
• Created: 1/1/2024, 12:00:00 AM

Your account is pending approval. An admin will review your application soon.
```

### Duplicate Error Message

When a duplicate is detected:

```
A hunter already exists with the same name.

Existing Hunter Details:
• Name: Existing Hunter
• Email: existing@email.com
• Strava ID: 123456
• Status: approved
• Created: 12/1/2023

Please use a different name or log in if this is your account.
```

The user is also offered a chance to log in if the existing account is theirs.

---

## Security Features

### 1. Database-Level Constraints

Even if the API check is bypassed, the database will reject duplicate inserts:

```sql
-- This will fail if name already exists
INSERT INTO users (name, email) 
VALUES ('Existing Name', 'new@email.com');
-- Error: duplicate key value violates unique constraint "users_name_key"
```

### 2. Pre-Insert Validation

The API checks for duplicates **before** attempting to insert, providing better error messages:

```typescript
// Check all unique fields
const duplicateChecks = {
  name: await checkName(name),
  email: await checkEmail(email),
  strava_id: await checkStravaId(strava_id)
}
```

### 3. Detailed Error Messages

Users get specific information about what field is duplicated and details about the existing account.

---

## Frontend Integration

The frontend (`app/page.tsx`) handles the responses:

1. **Success**: Shows success message with user details
2. **Duplicate (409)**: Shows detailed error and offers login option
3. **Other Errors**: Shows generic error message

```typescript
if (response.status === 409) {
  // Show detailed duplicate message
  
  // Offer to log in if existing user found
  if (responseData.existingUser) {
    const shouldLogin = confirm('Would you like to log in?');
    if (shouldLogin) router.push('/login');
  }
}
```

---

## Testing Checklist

- [ ] Run SQL script to add unique constraints
- [ ] Test creating user with duplicate name → Should fail with detailed message
- [ ] Test creating user with duplicate email → Should fail with detailed message
- [ ] Test creating user with duplicate strava_id → Should fail with detailed message
- [ ] Test creating new user → Should succeed with success message
- [ ] Test admin create-pending-user endpoint → Should check duplicates
- [ ] Verify frontend shows proper feedback messages

---

## Troubleshooting

### "Cannot add unique constraint - duplicate exists"

You have existing duplicates in your database. Clean them up first:

```sql
-- Find and remove duplicates (keep the oldest one)
WITH duplicates AS (
  SELECT id, name, 
         ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at) as rn
  FROM public.users
  WHERE name IS NOT NULL
)
DELETE FROM public.users
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
```

### "User created but no feedback shown"

Check the browser console for errors. The success message should appear in an alert dialog.

### "Duplicate check not working"

1. Verify constraints exist: `SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'users' AND constraint_type = 'UNIQUE';`
2. Check API logs for duplicate check queries
3. Ensure `supabaseAdmin` client is configured correctly

---

## Summary

✅ **Unique constraints** on name, email, strava_id, auth_user_id  
✅ **Pre-insert duplicate checking** in API  
✅ **Detailed feedback messages** for users  
✅ **Database-level enforcement** as backup  
✅ **Frontend integration** with proper error handling  

This system ensures no duplicate users can be created while providing clear feedback to users about what went wrong and how to fix it.


