
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dispatch-customer-fordo-schedules') THEN
    PERFORM cron.unschedule('dispatch-customer-fordo-schedules');
  END IF;
END $$;

SELECT cron.schedule(
  'dispatch-customer-fordo-schedules',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://hnkyeohwjcqhgulgdydd.supabase.co/functions/v1/customer-dispatch-fordo-schedules',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhua3llb2h3amNxaGd1bGdkeWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMDI4MDYsImV4cCI6MjA5MjU3ODgwNn0.-7U11D7z5RC55gv8Wpf__4M673gyyHrGK8Rb2S6kAMY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
