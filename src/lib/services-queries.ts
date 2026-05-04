import { queryOptions } from "@tanstack/react-query";
import type { Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export type Service = {
  id: string;
  shop_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number | null;
  duration_label: string | null;
  unit: string;
  warranty_enabled: boolean;
  warranty_value: number | null;
  warranty_unit: string | null;
  image_url: string | null;
  is_active: boolean;
  is_marketplace_published: boolean;
  is_featured: boolean;
  home_service: boolean;
  service_charge_extra: number | null;
  service_areas?: string[] | null;
  advance_amount?: number | null;
  advance_required?: boolean | null;
  booking_enabled?: boolean | null;
};

export type ServiceCategory = {
  id: string;
  shop_id: string;
  name: string;
  parent_id: string | null;
};

export const servicesListQuery = (shopId: string | null | undefined) =>
  queryOptions({
    queryKey: ["services", "list", shopId],
    enabled: !!shopId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!shopId) return [] as Service[];
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("shop_id", shopId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Service[];
    },
  });

export const servicesLiteQuery = (shopId: string | null | undefined) =>
  queryOptions({
    queryKey: ["services", "lite", shopId],
    enabled: !!shopId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!shopId) return [] as Service[];
      const { data, error } = await supabase
        .from("services")
        .select("id,shop_id,category_id,name,description,price,duration_minutes,duration_label,unit,warranty_enabled,warranty_value,warranty_unit,image_url,is_active,is_marketplace_published,is_featured,home_service,service_charge_extra")
        .eq("shop_id", shopId)
        .is("deleted_at", null)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Service[];
    },
  });

export const serviceCategoriesQuery = (shopId: string | null | undefined) =>
  queryOptions({
    queryKey: ["service_categories", shopId],
    enabled: !!shopId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!shopId) return [] as ServiceCategory[];
      const { data, error } = await supabase
        .from("service_categories")
        .select("id,shop_id,name,parent_id")
        .eq("shop_id", shopId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as ServiceCategory[];
    },
  });

export function durationToText(s: Service, lang: Lang): string {
  if (s.duration_label) return s.duration_label;
  if (!s.duration_minutes) return "";
  const m = s.duration_minutes;
  if (m < 60) return lang === "bn" ? `${m} মিনিট` : `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (lang === "bn") return r ? `${h} ঘন্টা ${r} মিনিট` : `${h} ঘন্টা`;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function warrantyToText(s: { warranty_enabled: boolean; warranty_value: number | null; warranty_unit: string | null }, lang: Lang): string | null {
  if (!s.warranty_enabled || !s.warranty_value) return null;
  const unit = s.warranty_unit || "days";
  const labels: Record<string, [string, string]> = {
    days: ["দিন", "days"],
    months: ["মাস", "months"],
    years: ["বছর", "years"],
  };
  const [bn, en] = labels[unit] ?? labels.days;
  return lang === "bn" ? `${s.warranty_value} ${bn} ফ্রি সার্ভিস` : `${s.warranty_value} ${en} free re-service`;
}
