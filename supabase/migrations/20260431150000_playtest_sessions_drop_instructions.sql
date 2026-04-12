-- Session instructions are no longer stored per row; use playtests.instructions for all sessions.

ALTER TABLE public.playtest_sessions DROP COLUMN IF EXISTS instructions;
