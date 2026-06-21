-- Enable pg_net and pg_cron extensions for scheduling
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  -- Unschedule existing job if any, to make this idempotent
  BEGIN
    PERFORM cron.unschedule('daily-customer-segmentation');
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if job doesn't exist
  END;
  
  -- Schedule the edge function to run every day at midnight (00:00 UTC)
  PERFORM cron.schedule(
    'daily-customer-segmentation',
    '0 0 * * *',
    $cron$
    SELECT net.http_post(
      url=>'https://aktavfdahhbkreecsvpp.supabase.co/functions/v1/segment-customers',
      headers=>'{"Content-Type": "application/json"}'::jsonb,
      body=>'{}'::jsonb
    )
    $cron$
  );
END $$;
