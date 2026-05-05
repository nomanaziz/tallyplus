
CREATE TABLE public.variant_attribute_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_bn text NOT NULL,
  attribute_type text NOT NULL DEFAULT 'custom',
  values jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.variant_attribute_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vap_read_all" ON public.variant_attribute_presets FOR SELECT TO authenticated USING (true);
CREATE POLICY "vap_admin_insert" ON public.variant_attribute_presets FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "vap_admin_update" ON public.variant_attribute_presets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "vap_admin_delete" ON public.variant_attribute_presets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_vap_updated BEFORE UPDATE ON public.variant_attribute_presets FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.marketplace_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_product_id uuid NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  variant_label_en text NOT NULL,
  variant_label_bn text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_url text,
  barcode text,
  pack_size text,
  default_price numeric,
  default_cost numeric,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mpv_product ON public.marketplace_product_variants(marketplace_product_id);
ALTER TABLE public.marketplace_product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mpv_read_all" ON public.marketplace_product_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY "mpv_admin_insert" ON public.marketplace_product_variants FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "mpv_admin_update" ON public.marketplace_product_variants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "mpv_admin_delete" ON public.marketplace_product_variants FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_mpv_updated BEFORE UPDATE ON public.marketplace_product_variants FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.products
  ADD COLUMN parent_product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  ADD COLUMN variant_label text,
  ADD COLUMN variant_attributes jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX idx_products_parent ON public.products(parent_product_id);

INSERT INTO public.variant_attribute_presets (name_en, name_bn, attribute_type, is_default, sort_order, values) VALUES
('Diaper Size','ডায়াপার সাইজ','size',true,1,'[{"code":"NB","label_en":"New Born","label_bn":"নবজাতক"},{"code":"S","label_en":"Small","label_bn":"ছোট"},{"code":"M","label_en":"Medium","label_bn":"মাঝারি"},{"code":"L","label_en":"Large","label_bn":"বড়"},{"code":"XL","label_en":"Extra Large","label_bn":"এক্সএল"},{"code":"XXL","label_en":"XXL","label_bn":"এক্সএক্সএল"}]'::jsonb),
('Clothing Size','পোশাকের সাইজ','size',true,2,'[{"code":"XS","label_en":"XS","label_bn":"এক্সএস"},{"code":"S","label_en":"S","label_bn":"এস"},{"code":"M","label_en":"M","label_bn":"এম"},{"code":"L","label_en":"L","label_bn":"এল"},{"code":"XL","label_en":"XL","label_bn":"এক্সএল"},{"code":"XXL","label_en":"XXL","label_bn":"এক্সএক্সএল"}]'::jsonb),
('Shoe Size','জুতার সাইজ','size',true,3,'[{"code":"36","label_en":"36","label_bn":"৩৬"},{"code":"37","label_en":"37","label_bn":"৩৭"},{"code":"38","label_en":"38","label_bn":"৩৮"},{"code":"39","label_en":"39","label_bn":"৩৯"},{"code":"40","label_en":"40","label_bn":"৪০"},{"code":"41","label_en":"41","label_bn":"৪১"},{"code":"42","label_en":"42","label_bn":"৪২"},{"code":"43","label_en":"43","label_bn":"৪৩"},{"code":"44","label_en":"44","label_bn":"৪৪"},{"code":"45","label_en":"45","label_bn":"৪৫"}]'::jsonb),
('Color','রঙ','color',true,4,'[{"code":"red","label_en":"Red","label_bn":"লাল","hex":"#ef4444"},{"code":"blue","label_en":"Blue","label_bn":"নীল","hex":"#3b82f6"},{"code":"green","label_en":"Green","label_bn":"সবুজ","hex":"#22c55e"},{"code":"yellow","label_en":"Yellow","label_bn":"হলুদ","hex":"#eab308"},{"code":"black","label_en":"Black","label_bn":"কালো","hex":"#000000"},{"code":"white","label_en":"White","label_bn":"সাদা","hex":"#ffffff"},{"code":"pink","label_en":"Pink","label_bn":"গোলাপি","hex":"#ec4899"},{"code":"purple","label_en":"Purple","label_bn":"বেগুনি","hex":"#a855f7"},{"code":"orange","label_en":"Orange","label_bn":"কমলা","hex":"#f97316"},{"code":"grey","label_en":"Grey","label_bn":"ধূসর","hex":"#6b7280"},{"code":"brown","label_en":"Brown","label_bn":"বাদামি","hex":"#92400e"},{"code":"navy","label_en":"Navy","label_bn":"নেভি","hex":"#1e3a8a"}]'::jsonb),
('Volume','আয়তন','volume',true,5,'[{"code":"100ml","label_en":"100 ml","label_bn":"১০০ মিলি"},{"code":"250ml","label_en":"250 ml","label_bn":"২৫০ মিলি"},{"code":"500ml","label_en":"500 ml","label_bn":"৫০০ মিলি"},{"code":"1l","label_en":"1 L","label_bn":"১ লিটার"},{"code":"2l","label_en":"2 L","label_bn":"২ লিটার"},{"code":"5l","label_en":"5 L","label_bn":"৫ লিটার"}]'::jsonb),
('Weight','ওজন','weight',true,6,'[{"code":"100g","label_en":"100 g","label_bn":"১০০ গ্রাম"},{"code":"250g","label_en":"250 g","label_bn":"২৫০ গ্রাম"},{"code":"500g","label_en":"500 g","label_bn":"৫০০ গ্রাম"},{"code":"1kg","label_en":"1 kg","label_bn":"১ কেজি"},{"code":"2kg","label_en":"2 kg","label_bn":"২ কেজি"},{"code":"5kg","label_en":"5 kg","label_bn":"৫ কেজি"},{"code":"10kg","label_en":"10 kg","label_bn":"১০ কেজি"}]'::jsonb),
('Flavor','স্বাদ','flavor',true,7,'[{"code":"vanilla","label_en":"Vanilla","label_bn":"ভ্যানিলা"},{"code":"chocolate","label_en":"Chocolate","label_bn":"চকলেট"},{"code":"strawberry","label_en":"Strawberry","label_bn":"স্ট্রবেরি"},{"code":"mango","label_en":"Mango","label_bn":"আম"},{"code":"orange","label_en":"Orange","label_bn":"কমলা"},{"code":"banana","label_en":"Banana","label_bn":"কলা"}]'::jsonb);
