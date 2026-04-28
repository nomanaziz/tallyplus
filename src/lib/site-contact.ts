import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteContact = {
  facebook_url: string | null;
  youtube_url: string | null;
  whatsapp_number: string | null;
  password_reset_whatsapp: string | null;
  support_phone: string | null;
  support_email: string | null;
};

export function useSiteContact() {
  return useQuery({
    queryKey: ["site_contact"],
    queryFn: async (): Promise<SiteContact> => {
      const { data, error } = await supabase
        .from("affiliate_settings")
        .select(
          "facebook_url, youtube_url, whatsapp_number, password_reset_whatsapp, support_phone, support_email"
        )
        .maybeSingle();
      if (error) throw error;
      return (data ?? {
        facebook_url: null,
        youtube_url: null,
        whatsapp_number: null,
        password_reset_whatsapp: null,
        support_phone: null,
        support_email: null,
      }) as SiteContact;
    },
    staleTime: 5 * 60_000,
  });
}

/** Strip non-digits from phone for wa.me URL */
export function waDigits(num: string | null | undefined): string {
  if (!num) return "";
  return num.replace(/\D/g, "");
}