import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClock, MapPin, Phone, Search, Shield, ShieldAlert, ShieldCheck, ShieldOff, Printer } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { InvoiceDialog, type InvoiceData } from "@/components/app/InvoiceDialog";
import { useShop } from "@/lib/shop";

type Row = {
  id: string;
  service_name: string;
  service_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  final_amount: number | null;
  discount_amount: number | null;
  sale_id: string | null;
  area: string | null;
  upazila: string | null;
  district: string | null;
};

type Warranty = {
  service_id: string;
  customer_phone: string | null;
  starts_at: string;
  expires_at: string;
  status: string;
};

export function ServiceHistoryTab({ shopId }: { shopId: string }) {
  const { lang } = useI18n();
  const { current } = useShop();
  const [search, setSearch] = useState("");
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["service_history", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_bookings")
        .select("id,service_name,service_id,customer_name,customer_phone,customer_address,scheduled_at,completed_at,final_amount,discount_amount,sale_id,area,upazila,district")
        .eq("shop_id", shopId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false, nullsFirst: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const { data: warranties = [] } = useQuery({
    queryKey: ["service_history_warranties", shopId],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_warranties")
        .select("service_id,customer_phone,starts_at,expires_at,status")
        .eq("shop_id", shopId)
        .limit(500);
      return (data ?? []) as Warranty[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.service_name.toLowerCase().includes(q) ||
      r.customer_name.toLowerCase().includes(q) ||
      (r.customer_phone || "").includes(q),
    );
  }, [rows, search]);

  const findWarranty = (r: Row): Warranty | null => {
    const phone = r.customer_phone;
    return warranties.find((w) => w.service_id === r.service_id && w.customer_phone === phone) ?? null;
  };

  const printInvoice = async (r: Row) => {
    if (!r.sale_id || !current) return;
    const { data: items } = await supabase
      .from("sale_items")
      .select("name,qty,price,total")
      .eq("sale_id", r.sale_id);
    const { data: sale } = await supabase
      .from("sales")
      .select("subtotal,discount,total,paid,due,created_at,invoice_no")
      .eq("id", r.sale_id)
      .single();
    if (!sale) return;
    const s = sale as { subtotal: number; discount: number; total: number; paid: number; due: number; created_at: string; invoice_no: string | null };
    setInvoice({
      mode: "sell",
      shop: { name: current.name, address: current.address, phone: current.phone, logo_url: current.logo_url },
      party: { name: r.customer_name, phone: r.customer_phone, address: r.customer_address },
      invoiceNo: s.invoice_no || r.sale_id.slice(0, 8).toUpperCase(),
      date: s.created_at,
      items: (items ?? []).map((it) => ({ name: (it as { name: string }).name, qty: Number((it as { qty: number }).qty), unit: null, price: Number((it as { price: number }).price), total: Number((it as { total: number }).total) })),
      subtotal: Number(s.subtotal),
      discount: Number(s.discount),
      delivery: 0,
      grandTotal: Number(s.total),
      paid: Number(s.paid),
      currentDue: Number(s.due),
    });
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">{lang === "bn" ? "লোড হচ্ছে…" : "Loading…"}</div>;
  if (rows.length === 0) {
    return <EmptyState icon={<CalendarClock className="h-6 w-6" />} title={lang === "bn" ? "এখনও কোনো সম্পন্ন সার্ভিস নেই" : "No completed services yet"} />;
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={lang === "bn" ? "সার্ভিস / গ্রাহক / ফোন" : "Service / customer / phone"} className="pl-9" />
      </div>

      <div className="space-y-2">
        {filtered.map((r) => {
          const w = findWarranty(r);
          const now = Date.now();
          let badge: { tone: "active" | "expired" | "none"; label: string } = { tone: "none", label: lang === "bn" ? "ওয়ারেন্টি নেই" : "No warranty" };
          if (w) {
            const exp = new Date(w.expires_at).getTime();
            if (exp > now) {
              const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
              badge = { tone: "active", label: (lang === "bn" ? "ওয়ারেন্টি — " : "Warranty — ") + daysLeft + (lang === "bn" ? " দিন বাকি" : " days left") };
            } else {
              badge = { tone: "expired", label: lang === "bn" ? "ওয়ারেন্টি শেষ" : "Warranty expired" };
            }
          }
          const place = [r.area, r.upazila, r.district].filter(Boolean).join(", ");
          return (
            <div key={r.id} className="rounded-xl border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{r.service_name}</div>
                  <div className="mt-0.5 text-sm">
                    <span className="font-medium">{r.customer_name}</span>{" • "}
                    <a href={`tel:${r.customer_phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                      <Phone className="h-3 w-3" /> {r.customer_phone}
                    </a>
                  </div>
                  {(r.customer_address || place) && (
                    <div className="mt-0.5 text-xs text-muted-foreground inline-flex items-start gap-1">
                      <MapPin className="mt-0.5 h-3 w-3 flex-none" /> <span>{[r.customer_address, place].filter(Boolean).join(" — ")}</span>
                    </div>
                  )}
                  {r.completed_at && (
                    <div className="mt-0.5 text-xs text-muted-foreground inline-flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" /> {new Date(r.completed_at).toLocaleString(lang === "bn" ? "bn-BD" : "en-US")}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-primary">{fmtMoney(Number(r.final_amount ?? 0), lang)}</div>
                  {r.discount_amount && r.discount_amount > 0 ? (
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400">{lang === "bn" ? "ছাড়" : "Discount"}: {fmtMoney(Number(r.discount_amount), lang)}</div>
                  ) : null}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant={badge.tone === "active" ? "default" : badge.tone === "expired" ? "destructive" : "secondary"}
                  className="gap-1"
                >
                  {badge.tone === "active" ? <ShieldCheck className="h-3 w-3" /> : badge.tone === "expired" ? <ShieldAlert className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
                  {badge.label}
                </Badge>
                {w && badge.tone !== "none" && (
                  <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {new Date(w.starts_at).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US")} → {new Date(w.expires_at).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US")}
                  </span>
                )}
                {r.sale_id && (
                  <Button size="sm" variant="outline" className="ml-auto h-8 gap-1" onClick={() => printInvoice(r)}>
                    <Printer className="h-3.5 w-3.5" /> {lang === "bn" ? "ইনভয়েস" : "Invoice"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <InvoiceDialog open={!!invoice} onClose={() => setInvoice(null)} data={invoice} />
    </div>
  );
}