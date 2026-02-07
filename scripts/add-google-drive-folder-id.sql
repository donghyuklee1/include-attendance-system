-- Add google_drive_folder_id to seminars table
-- Run this in Supabase SQL Editor to enable auto-folder creation on seminar creation

BEGIN;

ALTER TABLE seminars
ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT;

COMMENT ON COLUMN seminars.google_drive_folder_id IS 'Google Drive folder ID for this seminar - created automatically when seminar is created';

COMMIT;
