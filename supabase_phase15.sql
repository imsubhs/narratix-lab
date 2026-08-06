-- ═══════════════════════════════════════════════════════════════
-- NARRATIX LAB — Phase 15 Beta Completion Database Migration
-- Run this in your Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Extend analyses table safely.
-- Add input_type, file_name, file_size, and file_type if they do not exist.
ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS input_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS file_type TEXT;
