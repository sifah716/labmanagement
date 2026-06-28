-- Migration 001: Add created_by and user_lab columns
-- Applied: automatically on startup for existing databases

ALTER TABLE kunjungan ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE kunjungan ADD COLUMN user_lab TEXT DEFAULT '';
ALTER TABLE peminjaman ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE peminjaman ADD COLUMN user_lab TEXT DEFAULT '';
