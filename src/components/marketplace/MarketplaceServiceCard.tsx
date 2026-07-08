import { getNumLocale } from "@/lib/i18n";
import { Link } from "@/lib/router";
import { CalendarPlus, Clock, Home, MapPin, Phone, Store, Wrench } from "lucide-react";

export type ServiceCardItem = {
  id: string;
  shop_id: string;
  name: string;
  description?: string | null;
  price: number;
  duration_minutes?: number | null;
  duration_label?: string | null;
  unit?: string | null;
  image_url?: string | null;
  home_service?: boolean | null;
  service_charge_extra?: number | null;
  service_areas?: string[] | null;
};

export type ServiceCardShop = {
  id: string;
  name: string;
  slug?: string | null;
  username?: string | null;
  logo_url?: string | null;
  address?: string | null;
  phone?: string | null;
};

function durationText(s: ServiceCardItem) {
  if (s.duration_label) return s.duration_label;
  if (!s.duration_minutes) return null;
  const m = s.duration_minutes;
  if (m < 60) return `${m} মিনিট`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} ঘ ${r} মি` : `${h} ঘন্টা`;
}

export function MarketplaceServiceCard({
  service,
  shop,
  showShopChip = true,
}: {
  service: ServiceCardItem;
  shop?: ServiceCardShop | null;
  showShopChip?: boolean;
}) {
  const dur = durationText(service);
  const areas = (service.service_areas ?? []).slice(0, 2);
  const moreAreas = (service.service_areas ?? []).length - areas.length;

  return (
    <Link
      to="/shop/service/$id"
      params={{ id: service.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {service.image_url ? (
          <img
            src={service.image_url}
            alt={service.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Wrench className="h-10 w-10" />
          </div>
        )}
        {service.home_service && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            <Home className="h-3 w-3" /> বাসায় সার্ভিস
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <div className="line-clamp-2 text-sm font-bold leading-tight">{service.name}</div>
        <div className="flex items-baseline gap-1 text-primary">
          <span className="text-base font-extrabold">৳{Number(service.price).toLocaleString(getNumLocale())}</span>
          {service.unit && <span className="text-[11px] text-muted-foreground">/ {service.unit}</span>}
        </div>
        {dur && (
          <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" /> {dur}
          </div>
        )}
        {areas.length > 0 && (
          <div className="line-clamp-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 flex-none" />
            <span className="truncate">{areas.join(", ")}{moreAreas > 0 ? ` +${moreAreas}` : ""}</span>
          </div>
        )}
        {showShopChip && shop && (
          <div className="mt-1 flex items-center gap-1.5">
            <div className="h-5 w-5 flex-none overflow-hidden rounded-full border bg-muted">
              {shop.logo_url ? (
                <img src={shop.logo_url} alt={shop.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center"><Store className="h-3 w-3 text-muted-foreground" /></div>
              )}
            </div>
            <span className="truncate text-[11px] font-medium">{shop.name}</span>
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-1">
          <span className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground">
            <CalendarPlus className="h-3 w-3" /> বুক করুন
          </span>
          {shop?.phone && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `tel:${shop.phone}`; }}
              className="inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold hover:bg-accent"
              title={`কল ${shop.phone}`}
            >
              <Phone className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}