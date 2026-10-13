/*
# Fix app_users FK constraint

## Overview
The app_users table was created with a foreign key to auth.users(id).
This prevents inserting demo user profile data before the auth user exists.
This migration removes the FK so app_users can hold profile data independently.

## Changes
- Drop FK constraint app_users_id_fkey (the REFERENCES auth.users constraint)
- Keep id as the primary key (plain uuid, no FK)

## Security
- No security changes.

## Notes
1. The app_users table is empty so dropping the FK is safe.
2. The app will look up app_users by email to find the profile after auth.
3. The id column can still match an auth.users id when a real user signs up.
*/

ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_id_fkey;
