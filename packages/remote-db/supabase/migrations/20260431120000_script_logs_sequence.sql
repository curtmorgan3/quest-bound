-- script_logs: monotonic order within the same millisecond (local ScriptLog.sequence).
-- Quoted identifier: "sequence" is a SQL reserved word.
ALTER TABLE public.script_logs
  ADD COLUMN IF NOT EXISTS "sequence" INTEGER;

COMMENT ON COLUMN public.script_logs."sequence" IS
  'Order among logs sharing the same timestamp; higher = later. NULL for legacy rows.';
