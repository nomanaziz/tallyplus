import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ensureAdsenseLoaded, normalizePublisherId, pushAdsbyGoogle } from "@/lib/adsense";

type AdSettings = {
  enabled: boolean;
  adsense_publisher_id: string | null;
  show_to_free_owners: boolean;
  show_to_consumers: boolean;
  show_to_subscribers: boolean;
};

type AdSlotRow = {
  slot_key: string;
  mode: "adsense" | "custom" | "disabled";
  adsense_slot_id: string | null;
  adsense_format: string;
  custom_image_url: string | null;
  custom_link_url: string | null;
  custom_title: string | null;
  is_active: boolean;
};

type AdConfig = {
  settings: AdSettings | null;
  slots: Record<string, AdSlotRow>;
};

let cache: { data: AdConfig | null; ts: number } = { data: null, ts: 0 };
const TTL_MS = 5 * 60 * 1000;
let inflight: Promise<AdConfig> | null = null;

async function fetchAdConfig(): Promise<AdConfig> {
  const now = Date.now();
  if (cache.data && now - cache.ts < TTL_MS) return cache.data;
  if (inflight) return inflight;
  inflight = (async () => {
    // Cast to any: ad_settings/ad_slots are new tables; generated types
    // refresh asynchronously after the migration.
    const sb = supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          eq: (c: string, v: unknown) => { maybeSingle: () => Promise<{ data: unknown }> };
        } & Promise<{ data: unknown }>;
      };
    };
    const [settingsRes, slotsRes] = await Promise.all([
      sb.from("ad_settings").select("*").eq("id", true).maybeSingle(),
      sb.from("ad_slots").select("*"),
    ]);
    const settings = (settingsRes.data as AdSettings | null) ?? null;
    const slotsArr = ((slotsRes.data as AdSlotRow[] | null) ?? []);
    const slots: Record<string, AdSlotRow> = {};
    for (const s of slotsArr) slots[s.slot_key] = s;
    const data: AdConfig = { settings, slots };
    cache = { data, ts: Date.now() };
    inflight = null;
    return data;
  })();
  return inflight;
}

/** Allow external code (admin Save button) to invalidate the cache. */
export function invalidateAdConfigCache(): void {
  cache = { data: null, ts: 0 };
}

function useAdConfig(): AdConfig | null {
  const [cfg, setCfg] = useState<AdConfig | null>(cache.data);
  useEffect(() => {
    let cancelled = false;
    fetchAdConfig().then((c) => { if (!cancelled) setCfg(c); }).catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, []);
  return cfg;
}

export type AdSlotProps = {
  slotKey: string;
  className?: string;
  /** Override audience: by default we hide for paid subscribers. */
  forceShow?: boolean;
};

export function AdSlot({ slotKey, className, forceShow }: AdSlotProps) {
  const cfg = useAdConfig();
  const { hasActiveSubscription, user } = useAuth();
  const insRef = useRef<HTMLModElement | null>(null);
  const pushed = useRef(false);

  const settings = cfg?.settings;
  const slot = cfg?.slots[slotKey];
  const publisher = normalizePublisherId(settings?.adsense_publisher_id);

  // Eagerly load AdSense script when needed (idempotent).
  useEffect(() => {
    if (!settings?.enabled) return;
    if (slot?.mode !== "adsense") return;
    if (!publisher) return;
    ensureAdsenseLoaded(publisher);
  }, [settings?.enabled, slot?.mode, publisher]);

  // Push the ad once after the <ins> mounts.
  useEffect(() => {
    if (pushed.current) return;
    if (!insRef.current) return;
    if (!settings?.enabled || slot?.mode !== "adsense" || !publisher || !slot?.adsense_slot_id) return;
    // Defer to next tick so the script has time to attach.
    const t = setTimeout(() => {
      pushAdsbyGoogle();
      pushed.current = true;
    }, 50);
    return () => clearTimeout(t);
  }, [settings?.enabled, slot?.mode, slot?.adsense_slot_id, publisher]);

  if (!cfg || !settings || !slot) return null;
  if (!settings.enabled) return null;
  if (!slot.is_active || slot.mode === "disabled") return null;

  // Audience gating
  if (!forceShow) {
    if (hasActiveSubscription && !settings.show_to_subscribers) return null;
    // Anonymous/public visitors always see ads (e.g. on /f/:slug). Logged-in
    // gating only applies once we know who the user is.
    if (user) {
      // We don't have a hard "is consumer" flag here, so we rely on the two
      // toggles together: if BOTH are off, hide. Specific role separation is
      // handled by which slots admin assigns to which placements.
      if (!settings.show_to_free_owners && !settings.show_to_consumers) return null;
    }
  }

  if (slot.mode === "custom") {
    if (!slot.custom_image_url) return null;
    const img = (
      <img
        src={slot.custom_image_url}
        alt={slot.custom_title ?? "Advertisement"}
        className="block h-auto w-full rounded-md object-cover"
        loading="lazy"
      />
    );
    return (
      <AdFrame className={className}>
        {slot.custom_link_url ? (
          <a href={slot.custom_link_url} target="_blank" rel="noopener noreferrer sponsored">
            {img}
          </a>
        ) : img}
      </AdFrame>
    );
  }

  // adsense mode
  if (!publisher || !slot.adsense_slot_id) return null;
  return (
    <AdFrame className={className}>
      <ins
        ref={insRef as React.RefObject<HTMLModElement>}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={publisher}
        data-ad-slot={slot.adsense_slot_id}
        data-ad-format={slot.adsense_format || "auto"}
        data-full-width-responsive="true"
      />
    </AdFrame>
  );
}

function AdFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`my-3 ${className ?? ""}`}>
      <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
        বিজ্ঞাপন · Advertisement
      </div>
      <div className="overflow-hidden rounded-md border bg-muted/30">
        {children}
      </div>
    </div>
  );
}

export default AdSlot;