import { Link, useParams } from "@/lib/router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ArrowLeft, Clock, Home, Loader2, MapPin, Phone, ShieldCheck, Store, Wrench, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceBookingDialog } from "@/components/shop/ServiceBookingDialog";
import { CalendarPlus } from "lucide-react";

type Service = {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number | null;
  duration_label: string | null;
  unit: string | null;
  image_url: string | null;
  home_service: boolean | null;
  service_charge_extra: number | null;
  service_areas: string[] | null;
  warranty_enabled: boolean | null;
  warranty_value: number | null;
  warranty_unit: string | null;
  advance_amount?: number | null;
  advance_required?: boolean | null;
  booking_enabled?: boolean | null;
};
type Shop = {
  id: string;
  name: string;
  slug: string | null;
  username: string | null;
  logo_url: string | null;
  cover_url: string | null;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  whatsapp_number: string | null;
};

function ServiceDetailPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState<Service | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void supabase.functions
      .invoke("marketplace-public", { body: { action: "service-detail", id } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data || (data as { error?: string }).error) {
          setError((data as { error?: string })?.error ?? error?.message ?? "ত্রুটি");
        } else {
          const d = data as { service: Service; shop: Shop };
          setService(d.service);
          setShop(d.shop);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !service || !shop) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <Wrench className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-semibold">{error ?? "সার্ভিস পাওয়া যায়নি"}</p>
        <Link to="/shop" className="text-primary hover:underline">মার্কেটপ্লেসে ফিরুন</Link>
      </div>
    );
  }

  const dur = service.duration_label
    ?? (service.duration_minutes ? `${service.duration_minutes} মিনিট` : null);
  const waText = encodeURIComponent(`আসসালামু আলাইকুম, "${service.name}" সার্ভিসটি সম্পর্কে জানতে চাই।`);
  const bookingEnabled = service.booking_enabled !== false;
  const advanceAmt = Number(service.advance_amount ?? 0);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <div className="border-b bg-card/40">
        <div className="container mx-auto px-4 py-2">
          <Link to="/shop" search={{ view: "services" } as never} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> সব সার্ভিস
          </Link>
        </div>
      </div>

      <main className="container mx-auto flex-1 px-4 py-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl border bg-muted">
            {service.image_url ? (
              <img src={service.image_url} alt={service.name} className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-muted-foreground">
                <Wrench className="h-16 w-16" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="text-2xl font-bold leading-tight">{service.name}</h1>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-primary">৳{Number(service.price).toLocaleString("bn-BD")}</span>
              {service.unit && <span className="text-sm text-muted-foreground">/ {service.unit}</span>}
            </div>
            {service.service_charge_extra ? (
              <div className="text-sm text-muted-foreground">
                + অতিরিক্ত সার্ভিস চার্জ: ৳{Number(service.service_charge_extra).toLocaleString("bn-BD")}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1 text-sm">
              {dur && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                  <Clock className="h-3.5 w-3.5" /> {dur}
                </span>
              )}
              {service.home_service && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <Home className="h-3.5 w-3.5" /> বাসায় সার্ভিস উপলভ্য
                </span>
              )}
              {service.warranty_enabled && service.warranty_value && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> {service.warranty_value} {service.warranty_unit ?? "দিন"} ফ্রি রি-সার্ভিস
                </span>
              )}
            </div>

            {service.description && (
              <div className="rounded-xl border bg-card p-3 text-sm whitespace-pre-line">
                {service.description}
              </div>
            )}

            {(service.service_areas ?? []).length > 0 && (
              <div>
                <div className="mb-1.5 text-sm font-semibold">সার্ভিস এলাকা</div>
                <div className="flex flex-wrap gap-1.5">
                  {(service.service_areas ?? []).map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                      <MapPin className="h-3 w-3" /> {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Shop card */}
            <div className="mt-2 flex items-center gap-3 rounded-xl border bg-card p-3">
              <div className="h-12 w-12 flex-none overflow-hidden rounded-full border bg-muted">
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt={shop.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Store className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{shop.name}</div>
                {shop.address && (
                  <div className="truncate text-xs text-muted-foreground inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {shop.address}
                  </div>
                )}
              </div>
              <Link
                to={shop.username ? "/vendor/$username" : "/shop/s/$slug"}
                params={shop.username ? ({ username: shop.username } as never) : ({ slug: shop.slug ?? "" } as never)}
                className="text-sm font-semibold text-primary hover:underline"
              >
                দোকান দেখুন
              </Link>
            </div>

            {/* CTAs */}
            <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
              {bookingEnabled && (
                <Button onClick={() => setBookingOpen(true)} className="gap-1.5">
                  <CalendarPlus className="h-4 w-4" /> এখনই বুক করুন
                </Button>
              )}
              {shop.phone ? (
                <a href={`tel:${shop.phone}`} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow hover:bg-primary/90">
                  <Phone className="h-4 w-4" /> ফোন করুন
                </a>
              ) : (
                <Button disabled variant="outline">ফোন নাম্বার নেই</Button>
              )}
              {shop.whatsapp_number || shop.phone ? (
                <a
                  href={`https://wa.me/${(shop.whatsapp_number ?? shop.phone ?? "").replace(/[^0-9]/g, "")}?text=${waText}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border bg-card px-4 py-2.5 text-sm font-bold hover:bg-accent"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              ) : null}
            </div>
            {advanceAmt > 0 && (
              <div className="text-xs text-amber-700 dark:text-amber-400">
                নোট: এই সার্ভিসে যাতায়াত / অগ্রিম ৳{advanceAmt.toLocaleString("bn-BD")}
                {service.advance_required ? " বাধ্যতামূলক" : " প্রযোজ্য"}।
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
      <ServiceBookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        service={{
          id: service.id,
          name: service.name,
          price: Number(service.price),
          advance_amount: service.advance_amount,
          advance_required: service.advance_required,
          booking_enabled: service.booking_enabled,
        }}
        shop={{ id: shop.id, name: shop.name, phone: shop.phone }}
      />
    </div>
  );
}

export default ServiceDetailPage;