import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Globe, Clock, Shield, Home, Wrench, Search, MapPin, CalendarClock, Phone, BadgeDollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { servicesListQuery, serviceCategoriesQuery, durationToText, warrantyToText, type Service } from "@/lib/services-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/app/EmptyState";
import { toast } from "sonner";
import { RequirePerm } from "@/components/app/RequirePerm";
import { ServiceCatalogPicker } from "@/components/app/ServiceCatalogPicker";
import { type CatalogItem } from "@/lib/service-catalog";
import { BdLocationPicker, type BdLocation } from "@/components/shared/BdLocationPicker";
import { X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

function ServicesPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery(servicesListQuery(current?.id ?? null));
  const { data: cats = [] } = useQuery(serviceCategoriesQuery(current?.id ?? null));
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [tab, setTab] = useState<string>(() => {
    if (typeof window === "undefined") return "list";
    const sp = new URLSearchParams(window.location.search);
    return sp.get("tab") === "bookings" ? "bookings" : "list";
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((s) => s.name.toLowerCase().includes(q)) : items;
  }, [items, search]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["services"] });

  const onDelete = async (s: Service) => {
    if (!confirm(lang === "bn" ? `"${s.name}" মুছে ফেলবেন?` : `Delete "${s.name}"?`)) return;
    const { error } = await supabase.from("services").update({ deleted_at: new Date().toISOString() }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(lang === "bn" ? "মুছে ফেলা হয়েছে" : "Deleted");
    refresh();
  };

  const togglePublish = async (s: Service) => {
    const { error } = await supabase.from("services").update({ is_marketplace_published: !s.is_marketplace_published }).eq("id", s.id);
    if (error) return toast.error(error.message);
    if (!s.is_marketplace_published) {
      // Create marketplace listing
      await supabase.from("marketplace_service_listings").upsert({
        shop_id: s.shop_id,
        service_id: s.id,
        price: s.price,
        warranty_value: s.warranty_value,
        warranty_unit: s.warranty_unit,
        is_published: true,
      }, { onConflict: "service_id" });
    } else {
      await supabase.from("marketplace_service_listings").update({ is_published: false }).eq("service_id", s.id);
    }
    toast.success(lang === "bn" ? "আপডেট হয়েছে" : "Updated");
    refresh();
  };

  if (!current) return null;

  return (
    <div className="container px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold md:text-2xl">{lang === "bn" ? "সার্ভিস" : "Services"}</h1>
          <div className="text-xs text-muted-foreground">
            {lang === "bn" ? "আপনার সার্ভিসের তালিকা ও মূল্য পরিচালনা করুন" : "Manage your services and pricing"}
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setOpenForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> {lang === "bn" ? "নতুন সার্ভিস" : "New Service"}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mb-3">
        <TabsList>
          <TabsTrigger value="list">{lang === "bn" ? "সার্ভিস তালিকা" : "Services"}</TabsTrigger>
          <TabsTrigger value="bookings" className="gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" /> {lang === "bn" ? "বুকিং" : "Bookings"}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="bookings" className="mt-3">
          <ServiceBookingsTab shopId={current.id} />
        </TabsContent>
        <TabsContent value="list" className="mt-3">
      <div className="mb-3 relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder={lang === "bn" ? "সার্ভিস খুঁজুন" : "Search service"} />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">{lang === "bn" ? "লোড হচ্ছে…" : "Loading…"}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-6 w-6" />}
          title={lang === "bn" ? "কোনো সার্ভিস নেই" : "No services yet"}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const dur = durationToText(s, lang);
            const war = warrantyToText(s, lang);
            return (
              <div key={s.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  {s.image_url ? (
                    <img src={s.image_url} alt={s.name} className="h-14 w-14 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted">
                      <Wrench className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{s.name}</div>
                    <div className="text-lg font-extrabold text-primary">{fmtMoney(Number(s.price), lang)}</div>
                    <div className="text-xs text-muted-foreground">{s.unit}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {dur && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"><Clock className="h-3 w-3" /> {dur}</span>}
                  {war && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5"><Shield className="h-3 w-3" /> {war}</span>}
                  {s.home_service && <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-0.5"><Home className="h-3 w-3" /> {lang === "bn" ? "হোম সার্ভিস" : "Home"}</span>}
                  {s.is_marketplace_published && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5"><Globe className="h-3 w-3" /> {lang === "bn" ? "অনলাইনে" : "Online"}</span>}
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {(() => {
                      const areas = s.service_areas ?? [];
                      if (areas.length === 0) return lang === "bn" ? "সর্বত্র উপলব্ধ" : "Available everywhere";
                      return (lang === "bn" ? "উপলব্ধ: " : "Available in: ") + areas.join(", ");
                    })()}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => { setEditing(s); setOpenForm(true); }}>
                    <Pencil className="h-3.5 w-3.5" /> {lang === "bn" ? "এডিট" : "Edit"}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => togglePublish(s)}>
                    <Globe className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => onDelete(s)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </TabsContent>
      </Tabs>

      <ServiceFormSheet
        open={openForm}
        onClose={() => setOpenForm(false)}
        editing={editing}
        shopId={current.id}
        categories={cats}
        onSaved={refresh}
      />
    </div>
  );
}

function ServiceFormSheet({ open, onClose, editing, shopId, categories, onSaved }: {
  open: boolean; onClose: () => void; editing: Service | null; shopId: string;
  categories: { id: string; name: string }[]; onSaved: () => void;
}) {
  const { lang } = useI18n();
  const [form, setForm] = useState<Partial<Service>>({});
  const [saving, setSaving] = useState(false);

  // Reset form when editing changes
  useMemo(() => {
    setForm(editing ? { ...editing } : {
      name: "",
      price: 0,
      unit: "service",
      duration_minutes: null,
      duration_label: "",
      warranty_enabled: false,
      warranty_value: null,
      warranty_unit: "days",
      home_service: false,
      is_marketplace_published: false,
      description: "",
      category_id: null,
      service_charge_extra: null,
      service_areas: [],
    });
  }, [editing, open]);

  const update = (patch: Partial<Service>) => setForm((p) => ({ ...p, ...patch }));

  const onSave = async () => {
    if (!form.name?.trim()) return toast.error(lang === "bn" ? "নাম দিন" : "Name required");
    setSaving(true);
    try {
      const payload = {
        shop_id: shopId,
        name: form.name.trim(),
        description: form.description ?? null,
        price: Number(form.price ?? 0),
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
        duration_label: form.duration_label || null,
        unit: form.unit || "service",
        warranty_enabled: !!form.warranty_enabled,
        warranty_value: form.warranty_enabled && form.warranty_value ? Number(form.warranty_value) : null,
        warranty_unit: form.warranty_enabled ? (form.warranty_unit || "days") : null,
        home_service: !!form.home_service,
        is_marketplace_published: !!form.is_marketplace_published,
        category_id: form.category_id || null,
        service_charge_extra: form.service_charge_extra ? Number(form.service_charge_extra) : null,
        service_areas: Array.isArray(form.service_areas) ? form.service_areas : [],
        booking_enabled: form.booking_enabled !== false,
        advance_amount: form.advance_amount ? Number(form.advance_amount) : 0,
        advance_required: !!form.advance_required,
      };
      let serviceId = editing?.id;
      if (editing) {
        const { error } = await supabase.from("services").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("services").insert(payload).select("id").single();
        if (error) throw error;
        serviceId = (data as { id: string }).id;
      }
      // Sync marketplace listing
      if (serviceId && payload.is_marketplace_published) {
        await supabase.from("marketplace_service_listings").upsert({
          shop_id: shopId,
          service_id: serviceId,
          price: payload.price,
          warranty_value: payload.warranty_value,
          warranty_unit: payload.warranty_unit,
          is_published: true,
          service_areas: payload.service_areas,
        }, { onConflict: "service_id" });
      } else if (serviceId) {
        await supabase.from("marketplace_service_listings").update({ is_published: false }).eq("service_id", serviceId);
      }
      toast.success(lang === "bn" ? "সংরক্ষণ হয়েছে" : "Saved");
      onSaved();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editing ? (lang === "bn" ? "সার্ভিস এডিট করুন" : "Edit Service") : (lang === "bn" ? "নতুন সার্ভিস" : "New Service")}</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 py-4">
          {!editing && (
            <div>
              <Label>{lang === "bn" ? "ক্যাটালগ" : "Catalog"}</Label>
              <ServiceCatalogPicker
                onPick={(item: CatalogItem) => {
                  update({
                    name: lang === "bn" ? item.name_bn : item.name_en,
                    description: lang === "bn" ? item.description_bn : item.description_en,
                    unit: item.default_unit ?? "service",
                    duration_minutes: item.default_duration_minutes ?? null,
                    duration_label: item.default_duration_label ?? "",
                    home_service: !!item.home_service_default,
                    warranty_enabled: !!item.warranty_default,
                    warranty_value: item.warranty_default?.value ?? null,
                    warranty_unit: item.warranty_default?.unit ?? "days",
                  });
                }}
              />
              <div className="mt-1 text-xs text-muted-foreground">
                {lang === "bn" ? "অথবা নিচে নিজে লিখুন" : "Or fill in manually below"}
              </div>
            </div>
          )}
          <div>
            <Label>{lang === "bn" ? "নাম" : "Name"} *</Label>
            <Input value={form.name ?? ""} onChange={(e) => update({ name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{lang === "bn" ? "মূল্য" : "Price"} *</Label>
              <Input type="number" value={form.price ?? 0} onChange={(e) => update({ price: Number(e.target.value) })} />
            </div>
            <div>
              <Label>{lang === "bn" ? "একক" : "Unit"}</Label>
              <Select value={form.unit ?? "service"} onValueChange={(v) => update({ unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">{lang === "bn" ? "প্রতি সার্ভিস" : "Per service"}</SelectItem>
                  <SelectItem value="hour">{lang === "bn" ? "প্রতি ঘন্টা" : "Per hour"}</SelectItem>
                  <SelectItem value="visit">{lang === "bn" ? "প্রতি ভিজিট" : "Per visit"}</SelectItem>
                  <SelectItem value="job">{lang === "bn" ? "প্রতি কাজ" : "Per job"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{lang === "bn" ? "সময় (মিনিট)" : "Duration (min)"}</Label>
              <Input type="number" value={form.duration_minutes ?? ""} onChange={(e) => update({ duration_minutes: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label>{lang === "bn" ? "সময় (টেক্সট)" : "Duration (text)"}</Label>
              <Input value={form.duration_label ?? ""} placeholder={lang === "bn" ? "যেমন: ১-২ দিন" : "e.g. 1-2 days"} onChange={(e) => update({ duration_label: e.target.value })} />
            </div>
          </div>
          {categories.length > 0 && (
            <div>
              <Label>{lang === "bn" ? "ক্যাটেগরি" : "Category"}</Label>
              <Select value={form.category_id ?? "none"} onValueChange={(v) => update({ category_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{lang === "bn" ? "নাই" : "None"}</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>{lang === "bn" ? "বিবরণ" : "Description"}</Label>
            <Textarea rows={3} value={form.description ?? ""} onChange={(e) => update({ description: e.target.value })} />
          </div>
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2"><Shield className="h-4 w-4" /> {lang === "bn" ? "ফ্রি সার্ভিস ওয়ারেন্টি" : "Free Re-service Warranty"}</Label>
              <Switch checked={!!form.warranty_enabled} onCheckedChange={(v) => update({ warranty_enabled: v })} />
            </div>
            {form.warranty_enabled && (
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" placeholder={lang === "bn" ? "মেয়াদ" : "Value"} value={form.warranty_value ?? ""} onChange={(e) => update({ warranty_value: e.target.value ? Number(e.target.value) : null })} />
                <Select value={form.warranty_unit ?? "days"} onValueChange={(v) => update({ warranty_unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">{lang === "bn" ? "দিন" : "Days"}</SelectItem>
                    <SelectItem value="months">{lang === "bn" ? "মাস" : "Months"}</SelectItem>
                    <SelectItem value="years">{lang === "bn" ? "বছর" : "Years"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2"><Home className="h-4 w-4" /> {lang === "bn" ? "হোম সার্ভিস (বাসায় গিয়ে)" : "Home service available"}</Label>
            <Switch checked={!!form.home_service} onCheckedChange={(v) => update({ home_service: v })} />
          </div>
          {form.home_service && (
            <div>
              <Label>{lang === "bn" ? "ভিজিট চার্জ (অতিরিক্ত)" : "Visit charge (extra)"}</Label>
              <Input type="number" value={form.service_charge_extra ?? ""} onChange={(e) => update({ service_charge_extra: e.target.value ? Number(e.target.value) : null })} />
            </div>
          )}
          {/* Booking & advance */}
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /> {lang === "bn" ? "অনলাইন বুকিং চালু" : "Online booking enabled"}</Label>
              <Switch checked={form.booking_enabled !== false} onCheckedChange={(v) => update({ booking_enabled: v })} />
            </div>
            <div className="text-xs text-muted-foreground">
              {lang === "bn"
                ? "বন্ধ থাকলে গ্রাহক শুধু ফোন করতে পারবে, অনলাইন বুকিং নিতে পারবে না।"
                : "When off, customers can only call you — no online booking."}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="flex items-center gap-1"><BadgeDollarSign className="h-3.5 w-3.5" /> {lang === "bn" ? "অগ্রিম / যাতায়াত (৳)" : "Advance / travel (৳)"}</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.advance_amount ?? ""}
                  onChange={(e) => update({ advance_amount: e.target.value ? Number(e.target.value) : 0 })}
                />
              </div>
              <div className="flex items-end justify-between rounded-md border px-3 py-2">
                <Label className="text-xs">{lang === "bn" ? "অগ্রিম বাধ্যতামূলক" : "Advance required"}</Label>
                <Switch checked={!!form.advance_required} onCheckedChange={(v) => update({ advance_required: v })} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2"><Globe className="h-4 w-4" /> {lang === "bn" ? "অনলাইন মার্কেটে দেখান" : "Show on online marketplace"}</Label>
            <Switch checked={!!form.is_marketplace_published} onCheckedChange={(v) => update({ is_marketplace_published: v })} />
          </div>
          <div className="rounded-md border p-3 space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {lang === "bn" ? "সার্ভিস এলাকা" : "Service Area"}
            </Label>
            <div className="text-xs text-muted-foreground">
              {lang === "bn"
                ? "বিভাগ → জেলা → উপজেলা/থানা সিলেক্ট করে \"যোগ করুন\"। একাধিক এলাকা যোগ করা যাবে। কিছু না দিলে \"সর্বত্র উপলব্ধ\" দেখাবে।"
                : "Pick Division → District → Upazila/Thana, then \"Add\". You can add multiple areas. Empty means \"available everywhere\"."}
            </div>
            <ServiceAreaPicker
              value={form.service_areas ?? []}
              onChange={(v) => update({ service_areas: v })}
            />
            {(form.service_areas ?? []).length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => update({ service_areas: [] })}>
                {lang === "bn" ? "সব মুছে \"সর্বত্র\" করুন" : "Clear (set to everywhere)"}
              </Button>
            )}
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "…" : lang === "bn" ? "সংরক্ষণ" : "Save"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function GuardedServicesPage() {
  return <RequirePerm group="products"><ServicesPage /></RequirePerm>;
}

type Booking = {
  id: string;
  shop_id: string;
  service_id: string;
  service_name: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  scheduled_at: string | null;
  note: string | null;
  service_price: number;
  advance_amount: number;
  advance_paid: boolean;
  advance_payment_method: string | null;
  advance_txn_id: string | null;
  status: string;
  created_at: string;
};

const STATUSES: { value: string; bn: string; en: string }[] = [
  { value: "pending", bn: "অপেক্ষমান", en: "Pending" },
  { value: "confirmed", bn: "নিশ্চিত", en: "Confirmed" },
  { value: "in_progress", bn: "চলছে", en: "In progress" },
  { value: "completed", bn: "সম্পন্ন", en: "Completed" },
  { value: "cancelled", bn: "বাতিল", en: "Cancelled" },
];

function ServiceBookingsTab({ shopId }: { shopId: string }) {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["service_bookings", shopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_bookings")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Booking[];
    },
  });

  const setStatus = async (b: Booking, status: string) => {
    const { error } = await supabase.from("service_bookings").update({ status }).eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success(lang === "bn" ? "আপডেট হয়েছে" : "Updated");
    qc.invalidateQueries({ queryKey: ["service_bookings", shopId] });
  };
  const setAdvancePaid = async (b: Booking, v: boolean) => {
    const { error } = await supabase.from("service_bookings").update({ advance_paid: v }).eq("id", b.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["service_bookings", shopId] });
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">{lang === "bn" ? "লোড হচ্ছে…" : "Loading…"}</div>;
  if (bookings.length === 0) {
    return <EmptyState icon={<CalendarClock className="h-6 w-6" />} title={lang === "bn" ? "এখনও কোনো বুকিং আসেনি" : "No bookings yet"} />;
  }
  return (
    <div className="space-y-2">
      {bookings.map((b) => (
        <div key={b.id} className="rounded-xl border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold truncate">{b.service_name}</div>
              <div className="mt-0.5 text-sm">
                <span className="font-medium">{b.customer_name}</span>
                {" • "}
                <a href={`tel:${b.customer_phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                  <Phone className="h-3 w-3" /> {b.customer_phone}
                </a>
              </div>
              {b.customer_address && (
                <div className="mt-0.5 text-xs text-muted-foreground inline-flex items-start gap-1">
                  <MapPin className="mt-0.5 h-3 w-3 flex-none" /> <span>{b.customer_address}</span>
                </div>
              )}
              {b.scheduled_at && (
                <div className="mt-0.5 text-xs text-muted-foreground inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" /> {new Date(b.scheduled_at).toLocaleString(lang === "bn" ? "bn-BD" : "en-US")}
                </div>
              )}
              {b.note && <div className="mt-1 text-xs italic text-muted-foreground">"{b.note}"</div>}
            </div>
            <Badge variant={b.status === "completed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"}>
              {STATUSES.find((s) => s.value === b.status)?.[lang] ?? b.status}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-muted px-2 py-0.5">{lang === "bn" ? "মূল্য" : "Price"}: ৳{Number(b.service_price).toLocaleString("bn-BD")}</span>
            {b.advance_amount > 0 && (
              <span className={`rounded-full px-2 py-0.5 ${b.advance_paid ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"}`}>
                {lang === "bn" ? "অগ্রিম" : "Advance"}: ৳{Number(b.advance_amount).toLocaleString("bn-BD")}
                {" "}{b.advance_paid ? (lang === "bn" ? "(পেইড)" : "(paid)") : (lang === "bn" ? "(বাকি)" : "(unpaid)")}
                {b.advance_payment_method ? ` • ${b.advance_payment_method}` : ""}
                {b.advance_txn_id ? ` • ${b.advance_txn_id}` : ""}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Select value={b.status} onValueChange={(v) => setStatus(b, v)}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s[lang]}</SelectItem>)}
              </SelectContent>
            </Select>
            {b.advance_amount > 0 && (
              <Button size="sm" variant="outline" onClick={() => setAdvancePaid(b, !b.advance_paid)}>
                {b.advance_paid ? (lang === "bn" ? "অগ্রিম বাকি দেখান" : "Mark unpaid") : (lang === "bn" ? "অগ্রিম পেইড" : "Mark paid")}
              </Button>
            )}
            <a href={`tel:${b.customer_phone}`} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent">
              <Phone className="h-3 w-3" /> {lang === "bn" ? "কল" : "Call"}
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function ServiceAreaPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { lang } = useI18n();
  const [loc, setLoc] = useState<BdLocation>({ division: null, district: null, upazila: null, area: null });

  const add = () => {
    if (!loc.division) return toast.error(lang === "bn" ? "বিভাগ দিন" : "Pick a division");
    const parts = [loc.division, loc.district, loc.upazila].filter(Boolean) as string[];
    const label = parts.join(" › ") + (loc.area?.trim() ? ` • ${loc.area.trim()}` : "");
    if (value.includes(label)) return toast.message(lang === "bn" ? "ইতিমধ্যে যোগ আছে" : "Already added");
    onChange([...value, label]);
    setLoc({ division: null, district: null, upazila: null, area: null });
  };
  const remove = (label: string) => onChange(value.filter((v) => v !== label));

  return (
    <div className="space-y-2">
      <BdLocationPicker value={loc} onChange={setLoc} showArea={false} />
      <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1">
        <Plus className="h-3.5 w-3.5" /> {lang === "bn" ? "এই এলাকা যোগ করুন" : "Add this area"}
      </Button>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
              {v}
              <button type="button" onClick={() => remove(v)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}