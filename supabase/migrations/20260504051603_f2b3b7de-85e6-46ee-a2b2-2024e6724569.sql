ALTER TABLE public.services ADD COLUMN IF NOT EXISTS service_areas text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.marketplace_service_listings ADD COLUMN IF NOT EXISTS service_areas text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_services_service_areas ON public.services USING GIN (service_areas);
CREATE INDEX IF NOT EXISTS idx_mkt_service_listings_service_areas ON public.marketplace_service_listings USING GIN (service_areas);