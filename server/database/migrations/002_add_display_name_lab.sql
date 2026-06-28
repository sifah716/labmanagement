-- Migration 002: Add display_name and lab columns to users
-- Applied: automatically on startup for existing databases

ALTER TABLE users ADD COLUMN display_name TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN lab TEXT DEFAULT '';
