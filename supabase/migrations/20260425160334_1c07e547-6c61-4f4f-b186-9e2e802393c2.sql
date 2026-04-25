-- Add theme customization fields to shops
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS theme_primary_color text DEFAULT '#1ca301',
  ADD COLUMN IF NOT EXISTS theme_secondary_color text DEFAULT '#ff324d',
  ADD COLUMN IF NOT EXISTS theme_border_radius integer DEFAULT 8,
  ADD COLUMN IF NOT EXISTS theme_font_family text DEFAULT 'Inter',
  ADD COLUMN IF NOT EXISTS theme_card_variant text DEFAULT 'primary';

-- Promo codes: ensure activate flag
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;