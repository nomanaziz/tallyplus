import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { writeWithOffline } from "@/lib/useOfflineWrite";
import { fmtMoney, bnNum } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Truck, ClipboardList, GitBranch, PiggyBank, CalendarDays, Building2, ArrowLeftRight } from "lucide-react";

type TR = (bn: string, en: string) => string;
type Lang = "bn" | "en";
type BottleType = { id: string; name: string; size_label: string | null };
type Contact = { id: string; name: string; phone: string | null };
type DeliveryMan = { id: string; name: string; phone: string | null };

/* ---------------- Warehouses ---------------- */
export function WarehousesTab({ shopId, tr }: { shopId: string; tr: TR }) {
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!shopId) return;
    supabase.from("warehouses").select("*").eq("shop_id", shopId).order("created_at")
      .then(({ data }) => setList(data ?? []));
  }, [shopId, tick]);

  const save = async () => {
    if (!name.trim()) return toast.error(tr("নাম লিখুন", "Enter name"));
    setBusy(true);
    const res = await writeWithOffline({
      table: "warehouses", op: "insert",
      payload: { shop_id: shopId, name: name.trim(), location: location.trim() || null, is_default: isDefault },
    });
    setBusy(false);
    if (!res.error) {
      toast.success(tr("যোগ হয়েছে", "Added"));
      setName(""); setLocation(""); setIsDefault(false); setTick(t => t + 1);
    } else toast.error(res.error || "Error");
  };

  const del = async (id: string) => {
    if (!confirm(tr("মুছে ফেলবেন?", "Delete?"))) return;
    const { error } = await supabase.from("warehouses").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success(tr("মুছে ফেলা হয়েছে", "Deleted")); setTick(t => t + 1); }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-3">
        <h3 className="mb-2 font-semibold flex items-center gap-1.5"><Building2 className="h-4 w-4" />{tr("নতুন গুদাম যোগ", "Add warehouse")}</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <div><Label>{tr("নাম", "Name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("যেমন: মূল গুদাম", "e.g. Main warehouse")} /></div>
          <div><Label>{tr("ঠিকানা", "Location")}</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />{tr("ডিফল্ট", "Default")}</label>
            <Button onClick={save} disabled={busy} className="ml-auto"><Plus className="mr-1 h-4 w-4" />{tr("যোগ", "Add")}</Button>
          </div>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {list.map((w) => (
          <div key={w.id} className="rounded-xl border bg-card p-3 flex items-start justify-between">
            <div>
              <div className="font-semibold flex items-center gap-1.5">{w.name} {w.is_default && <Badge variant="secondary">{tr("ডিফল্ট", "Default")}</Badge>}</div>
              <div className="text-xs text-muted-foreground">{w.location || "—"}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => del(w.id)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
          </div>
        ))}
        {list.length === 0 && <div className="md:col-span-2 rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">{tr("কোনো গুদাম নেই", "No warehouses yet")}</div>}
      </div>
    </div>
  );
}

/* ---------------- Stock Transfer ---------------- */
export function StockTransferTab({ shopId, types, tr, lang }: { shopId: string; types: BottleType[]; tr: TR; lang: Lang }) {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [list, setList] = useState<any[]>([]);
  const [fromW, setFromW] = useState(""); const [toW, setToW] = useState("");
  const [bottle, setBottle] = useState(""); const [qty, setQty] = useState("1");
  const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!shopId) return;
    supabase.from("warehouses").select("id,name").eq("shop_id", shopId).order("name")
      .then(({ data }) => setWarehouses(data ?? []));
    supabase.from("stock_transfers").select("*").eq("shop_id", shopId).order("transferred_at", { ascending: false }).limit(50)
      .then(({ data }) => setList(data ?? []));
  }, [shopId, tick]);

  const save = async () => {
    if (!fromW || !toW) return toast.error(tr("গুদাম বাছাই করুন", "Pick warehouses"));
    if (fromW === toW) return toast.error(tr("একই গুদাম হতে পারে না", "Source and destination must differ"));
    if (!Number(qty)) return toast.error(tr("সংখ্যা ঠিক নয়", "Invalid quantity"));
    setBusy(true);
    const res = await writeWithOffline({
      table: "stock_transfers", op: "insert",
      payload: { shop_id: shopId, from_warehouse_id: fromW, to_warehouse_id: toW, bottle_type_id: bottle || null, qty: Number(qty), note: note || null, status: "completed" },
    });
    setBusy(false);
    if (!res.error) { toast.success(tr("ট্রান্সফার হয়েছে", "Transferred")); setQty("1"); setNote(""); setTick(t => t + 1); }
    else toast.error(res.error || "Error");
  };

  const whName = (id: string) => warehouses.find(w => w.id === id)?.name ?? "—";
  const btName = (id: string | null) => { const t = types.find(x => x.id === id); return t ? t.name + (t.size_label ? ` (${t.size_label})` : "") : "—"; };

  if (warehouses.length < 2) {
    return <div className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">{tr("ট্রান্সফার করতে অন্তত ২টি গুদাম যোগ করুন", "Add at least 2 warehouses to transfer")}</div>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-3">
        <h3 className="mb-2 font-semibold flex items-center gap-1.5"><ArrowLeftRight className="h-4 w-4" />{tr("নতুন ট্রান্সফার", "New transfer")}</h3>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
          <div><Label>{tr("যেখান থেকে", "From")}</Label>
            <Select value={fromW} onValueChange={setFromW}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>{tr("যেখানে", "To")}</Label>
            <Select value={toW} onValueChange={setToW}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>{tr("বোতল", "Bottle")}</Label>
            <Select value={bottle} onValueChange={setBottle}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{types.map(t => <SelectItem key={t.id} value={t.id}>{t.name}{t.size_label ? ` (${t.size_label})` : ""}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>{tr("সংখ্যা", "Qty")}</Label><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          <div className="flex items-end"><Button onClick={save} disabled={busy} className="w-full"><Plus className="mr-1 h-4 w-4" />{tr("ট্রান্সফার", "Transfer")}</Button></div>
        </div>
        <div className="mt-2"><Label>{tr("নোট", "Note")}</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr><th className="px-3 py-2 text-left">{tr("তারিখ", "Date")}</th>
                <th className="px-3 py-2 text-left">{tr("থেকে", "From")}</th>
                <th className="px-3 py-2 text-left">{tr("যেখানে", "To")}</th>
                <th className="px-3 py-2 text-left">{tr("বোতল", "Bottle")}</th>
                <th className="px-3 py-2 text-right">{tr("সংখ্যা", "Qty")}</th></tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">{tr("কোনো ট্রান্সফার নেই", "No transfers")}</td></tr>}
            {list.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{new Date(r.transferred_at).toLocaleDateString("en-GB")}</td>
                <td className="px-3 py-2">{whName(r.from_warehouse_id)}</td>
                <td className="px-3 py-2">{whName(r.to_warehouse_id)}</td>
                <td className="px-3 py-2">{btName(r.bottle_type_id)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{bnNum(String(r.qty))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Brand Balance ---------------- */
export function BrandBalanceTab({ shopId, tr }: { shopId: string; tr: TR }) {
  const [list, setList] = useState<any[]>([]);
  const [bFrom, setBFrom] = useState(""); const [bTo, setBTo] = useState("");
  const [size, setSize] = useState(""); const [qty, setQty] = useState("1");
  const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!shopId) return;
    supabase.from("brand_balance_entries").select("*").eq("shop_id", shopId).order("occurred_at", { ascending: false }).limit(100)
      .then(({ data }) => setList(data ?? []));
  }, [shopId, tick]);

  const balances = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of list) {
      const k = `${e.brand_from} → ${e.brand_to}${e.size_label ? ` · ${e.size_label}` : ""}`;
      m.set(k, (m.get(k) ?? 0) + Number(e.qty || 0));
    }
    return Array.from(m.entries());
  }, [list]);

  const save = async () => {
    if (!bFrom.trim() || !bTo.trim()) return toast.error(tr("ব্র্যান্ড লিখুন", "Enter brands"));
    setBusy(true);
    const res = await writeWithOffline({
      table: "brand_balance_entries", op: "insert",
      payload: { shop_id: shopId, brand_from: bFrom.trim(), brand_to: bTo.trim(), size_label: size.trim() || null, qty: Number(qty) || 0, note: note.trim() || null },
    });
    setBusy(false);
    if (!res.error) { toast.success(tr("যোগ হয়েছে", "Added")); setQty("1"); setNote(""); setTick(t => t + 1); }
    else toast.error(res.error || "Error");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-3">
        <h3 className="mb-2 font-semibold flex items-center gap-1.5"><GitBranch className="h-4 w-4" />{tr("ব্র্যান্ড বিনিময়", "Brand exchange")}</h3>
        <p className="mb-2 text-xs text-muted-foreground">{tr("যখন এক ব্র্যান্ডের খালি বোতল দিয়ে অন্য ব্র্যান্ডের বোতল আনেন, এখানে হিসাব রাখুন।", "Track when you exchange empty bottles of one brand for another.")}</p>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
          <div><Label>{tr("যে ব্র্যান্ড দিলেন", "Gave brand")}</Label><Input value={bFrom} onChange={(e) => setBFrom(e.target.value)} placeholder="বসুন্ধরা" /></div>
          <div><Label>{tr("যে ব্র্যান্ড পেলেন", "Got brand")}</Label><Input value={bTo} onChange={(e) => setBTo(e.target.value)} placeholder="যমুনা" /></div>
          <div><Label>{tr("সাইজ", "Size")}</Label><Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="12kg" /></div>
          <div><Label>{tr("সংখ্যা", "Qty")}</Label><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          <div className="flex items-end"><Button onClick={save} disabled={busy} className="w-full"><Plus className="mr-1 h-4 w-4" />{tr("যোগ", "Add")}</Button></div>
        </div>
        <div className="mt-2"><Label>{tr("নোট", "Note")}</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
      </div>

      {balances.length > 0 && (
        <div className="rounded-xl border bg-card p-3">
          <h3 className="mb-2 font-semibold">{tr("ব্যালেন্স সারাংশ", "Balance summary")}</h3>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {balances.map(([k, v]) => (
              <div key={k} className="flex justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                <span>{k}</span>
                <span className="font-bold tabular-nums">{bnNum(String(v))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr><th className="px-3 py-2 text-left">{tr("তারিখ", "Date")}</th><th className="px-3 py-2 text-left">{tr("দিলেন", "Gave")}</th><th className="px-3 py-2 text-left">{tr("পেলেন", "Got")}</th><th className="px-3 py-2 text-right">{tr("সংখ্যা", "Qty")}</th><th className="px-3 py-2 text-left">{tr("নোট", "Note")}</th></tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">{tr("কোনো এন্ট্রি নেই", "No entries")}</td></tr>}
            {list.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{new Date(r.occurred_at).toLocaleDateString("en-GB")}</td>
                <td className="px-3 py-2">{r.brand_from}{r.size_label ? ` (${r.size_label})` : ""}</td>
                <td className="px-3 py-2">{r.brand_to}{r.size_label ? ` (${r.size_label})` : ""}</td>
                <td className="px-3 py-2 text-right tabular-nums">{bnNum(String(r.qty))}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Deliveries ---------------- */
export function DeliveriesTab({ shopId, types, contacts, deliveryMen, tr }: { shopId: string; types: BottleType[]; contacts: Contact[]; deliveryMen: DeliveryMan[]; tr: TR }) {
  const [list, setList] = useState<any[]>([]);
  const [customer, setCustomer] = useState(""); const [dm, setDm] = useState("");
  const [bottle, setBottle] = useState(""); const [qty, setQty] = useState("1");
  const [address, setAddress] = useState(""); const [phone, setPhone] = useState("");
  const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!shopId) return;
    supabase.from("deliveries").select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setList(data ?? []));
  }, [shopId, tick]);

  const save = async () => {
    if (!customer) return toast.error(tr("গ্রাহক বাছাই করুন", "Pick customer"));
    setBusy(true);
    const res = await writeWithOffline({
      table: "deliveries", op: "insert",
      payload: { shop_id: shopId, customer_id: customer, delivery_man_id: dm || null, bottle_type_id: bottle || null, qty: Number(qty) || 1, address: address || null, phone: phone || null, note: note || null, status: "assigned" },
    });
    setBusy(false);
    if (!res.error) { toast.success(tr("যোগ হয়েছে", "Added")); setCustomer(""); setDm(""); setBottle(""); setQty("1"); setAddress(""); setPhone(""); setNote(""); setTick(t => t + 1); }
    else toast.error(res.error || "Error");
  };

  const setStatus = async (id: string, status: string) => {
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === "delivered") updates.delivered_at = new Date().toISOString();
    const { error } = await supabase.from("deliveries").update(updates).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(tr("আপডেট হয়েছে", "Updated")); setTick(t => t + 1); }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { assigned: "bg-amber-100 text-amber-800", in_transit: "bg-sky-100 text-sky-800", delivered: "bg-emerald-100 text-emerald-800", cancelled: "bg-rose-100 text-rose-800" };
    const lbl: Record<string, string> = { assigned: tr("বরাদ্দ", "Assigned"), in_transit: tr("পথে", "In transit"), delivered: tr("ডেলিভার্ড", "Delivered"), cancelled: tr("বাতিল", "Cancelled") };
    return <Badge className={map[s] || ""}>{lbl[s] || s}</Badge>;
  };

  const cName = (id: string | null) => contacts.find(c => c.id === id)?.name ?? "—";
  const dName = (id: string | null) => deliveryMen.find(d => d.id === id)?.name ?? "—";
  const bName = (id: string | null) => { const t = types.find(x => x.id === id); return t ? t.name : "—"; };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-3">
        <h3 className="mb-2 font-semibold flex items-center gap-1.5"><Truck className="h-4 w-4" />{tr("নতুন ডেলিভারি বরাদ্দ", "Assign delivery")}</h3>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          <div><Label>{tr("গ্রাহক", "Customer")}</Label>
            <Select value={customer} onValueChange={setCustomer}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>{tr("ডেলিভারি ম্যান", "Delivery man")}</Label>
            <Select value={dm} onValueChange={setDm}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{deliveryMen.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>{tr("বোতল", "Bottle")}</Label>
            <Select value={bottle} onValueChange={setBottle}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{types.map(t => <SelectItem key={t.id} value={t.id}>{t.name}{t.size_label ? ` (${t.size_label})` : ""}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>{tr("সংখ্যা", "Qty")}</Label><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          <div><Label>{tr("ফোন", "Phone")}</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="flex items-end"><Button onClick={save} disabled={busy} className="w-full"><Plus className="mr-1 h-4 w-4" />{tr("বরাদ্দ", "Assign")}</Button></div>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div><Label>{tr("ঠিকানা", "Address")}</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <div><Label>{tr("নোট", "Note")}</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {list.length === 0 && <div className="md:col-span-2 lg:col-span-3 rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">{tr("কোনো ডেলিভারি নেই", "No deliveries")}</div>}
        {list.map((d) => (
          <div key={d.id} className="rounded-xl border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-semibold">{cName(d.customer_id)}</div>
                <div className="text-xs text-muted-foreground">{d.phone || "—"}</div>
              </div>
              {statusBadge(d.status)}
            </div>
            <div className="mt-1.5 text-xs text-muted-foreground">{bName(d.bottle_type_id)} × {bnNum(String(d.qty))}</div>
            {d.address && <div className="mt-1 text-xs">📍 {d.address}</div>}
            <div className="mt-1 text-xs text-muted-foreground">🚚 {dName(d.delivery_man_id)}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {d.status !== "in_transit" && d.status !== "delivered" && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setStatus(d.id, "in_transit")}>{tr("পথে", "In transit")}</Button>}
              {d.status !== "delivered" && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setStatus(d.id, "delivered")}>{tr("ডেলিভার্ড", "Delivered")}</Button>}
              {d.status !== "cancelled" && d.status !== "delivered" && <Button size="sm" variant="ghost" className="text-xs h-7 text-rose-600" onClick={() => setStatus(d.id, "cancelled")}>{tr("বাতিল", "Cancel")}</Button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Refill Bookings ---------------- */
export function RefillBookingsTab({ shopId, types, contacts, tr }: { shopId: string; types: BottleType[]; contacts: Contact[]; tr: TR }) {
  const [list, setList] = useState<any[]>([]);
  const [customer, setCustomer] = useState(""); const [bottle, setBottle] = useState("");
  const [qty, setQty] = useState("1"); const [phone, setPhone] = useState("");
  const [address, setAddress] = useState(""); const [bookedFor, setBookedFor] = useState("");
  const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!shopId) return;
    supabase.from("refill_bookings").select("*").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setList(data ?? []));
  }, [shopId, tick]);

  const save = async () => {
    if (!customer) return toast.error(tr("গ্রাহক বাছাই করুন", "Pick customer"));
    setBusy(true);
    const res = await writeWithOffline({
      table: "refill_bookings", op: "insert",
      payload: { shop_id: shopId, customer_id: customer, bottle_type_id: bottle || null, qty: Number(qty) || 1, phone: phone || null, address: address || null, booked_for: bookedFor || null, note: note || null, status: "pending" },
    });
    setBusy(false);
    if (!res.error) { toast.success(tr("বুকিং হয়েছে", "Booked")); setCustomer(""); setBottle(""); setQty("1"); setPhone(""); setAddress(""); setBookedFor(""); setNote(""); setTick(t => t + 1); }
    else toast.error(res.error || "Error");
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("refill_bookings").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(tr("আপডেট", "Updated")); setTick(t => t + 1); }
  };

  const cName = (id: string | null) => contacts.find(c => c.id === id)?.name ?? "—";
  const bName = (id: string | null) => { const t = types.find(x => x.id === id); return t ? t.name : "—"; };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-3">
        <h3 className="mb-2 font-semibold flex items-center gap-1.5"><ClipboardList className="h-4 w-4" />{tr("নতুন রিফিল বুকিং", "New refill booking")}</h3>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          <div><Label>{tr("গ্রাহক", "Customer")}</Label>
            <Select value={customer} onValueChange={setCustomer}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>{tr("বোতল", "Bottle")}</Label>
            <Select value={bottle} onValueChange={setBottle}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{types.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>{tr("সংখ্যা", "Qty")}</Label><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          <div><Label>{tr("ফোন", "Phone")}</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label>{tr("কখন দরকার", "Booked for")}</Label><Input type="datetime-local" value={bookedFor} onChange={(e) => setBookedFor(e.target.value)} /></div>
          <div className="flex items-end"><Button onClick={save} disabled={busy} className="w-full"><Plus className="mr-1 h-4 w-4" />{tr("বুকিং", "Book")}</Button></div>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div><Label>{tr("ঠিকানা", "Address")}</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <div><Label>{tr("নোট", "Note")}</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr><th className="px-3 py-2 text-left">{tr("গ্রাহক", "Customer")}</th>
                <th className="px-3 py-2 text-left">{tr("বোতল", "Bottle")}</th>
                <th className="px-3 py-2 text-right">{tr("সংখ্যা", "Qty")}</th>
                <th className="px-3 py-2 text-left">{tr("কখন", "When")}</th>
                <th className="px-3 py-2 text-left">{tr("স্ট্যাটাস", "Status")}</th>
                <th className="px-3 py-2"></th></tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">{tr("কোনো বুকিং নেই", "No bookings")}</td></tr>}
            {list.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{cName(r.customer_id)} <span className="text-xs text-muted-foreground">{r.phone || ""}</span></td>
                <td className="px-3 py-2">{bName(r.bottle_type_id)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{bnNum(String(r.qty))}</td>
                <td className="px-3 py-2 text-xs">{r.booked_for ? new Date(r.booked_for).toLocaleString("en-GB") : "—"}</td>
                <td className="px-3 py-2"><Badge variant={r.status === "fulfilled" ? "default" : r.status === "cancelled" ? "destructive" : "secondary"}>{r.status}</Badge></td>
                <td className="px-3 py-2 text-right">
                  {r.status === "pending" && (
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setStatus(r.id, "fulfilled")}>{tr("সম্পন্ন", "Fulfill")}</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-600" onClick={() => setStatus(r.id, "cancelled")}>{tr("বাতিল", "Cancel")}</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Capital Tracker ---------------- */
export function CapitalTab({ shopId, tr, lang }: { shopId: string; tr: TR; lang: Lang }) {
  const [settings, setSettings] = useState<any>(null);
  const [opening, setOpening] = useState("");
  const [busy, setBusy] = useState(false);
  const [todayCash, setTodayCash] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!shopId) return;
    supabase.from("shop_settings").select("*").eq("shop_id", shopId).maybeSingle()
      .then(({ data }) => { setSettings(data); setOpening(data?.opening_capital?.toString() ?? ""); });
    const today = new Date().toISOString().slice(0, 10);
    supabase.from("bottle_movements").select("cash_collected").eq("shop_id", shopId).gte("occurred_at", today)
      .then(({ data }) => setTodayCash((data ?? []).reduce((a: number, r: any) => a + Number(r.cash_collected || 0), 0)));
  }, [shopId, tick]);

  const save = async () => {
    const amt = Number(opening) || 0;
    setBusy(true);
    const { error } = await supabase.from("shop_settings").upsert({
      shop_id: shopId, opening_capital: amt, capital_set_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: "shop_id" });
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success(tr("সংরক্ষিত", "Saved")); setTick(t => t + 1); }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-3">
        <h3 className="mb-2 font-semibold flex items-center gap-1.5"><PiggyBank className="h-4 w-4" />{tr("ব্যবসার মূলধন", "Business capital")}</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="sm:col-span-2"><Label>{tr("ওপেনিং ক্যাপিটাল (টাকা)", "Opening capital (BDT)")}</Label>
            <Input type="number" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0" /></div>
          <div className="flex items-end"><Button onClick={save} disabled={busy} className="w-full">{tr("সংরক্ষণ", "Save")}</Button></div>
        </div>
        {settings?.capital_set_at && <p className="mt-2 text-xs text-muted-foreground">{tr("সর্বশেষ আপডেট:", "Last updated:")} {new Date(settings.capital_set_at).toLocaleString("en-GB")}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-3"><div className="text-xs text-muted-foreground">{tr("ওপেনিং ক্যাপিটাল", "Opening capital")}</div><div className="mt-1 text-xl font-bold tabular-nums">{fmtMoney(settings?.opening_capital ?? 0, lang)}</div></div>
        <div className="rounded-xl border bg-card p-3"><div className="text-xs text-muted-foreground">{tr("আজকের নগদ আদায়", "Today's cash collected")}</div><div className="mt-1 text-xl font-bold tabular-nums text-emerald-700">{fmtMoney(todayCash, lang)}</div></div>
        <div className="rounded-xl border bg-card p-3"><div className="text-xs text-muted-foreground">{tr("আজকের আনুমানিক হাতের ক্যাশ", "Estimated cash in hand")}</div><div className="mt-1 text-xl font-bold tabular-nums">{fmtMoney(Number(settings?.opening_capital ?? 0) + todayCash, lang)}</div></div>
      </div>
      <p className="text-xs text-muted-foreground">{tr("নোট: পূর্ণ মুনাফা ও ব্যয় হিসাবের জন্য Profit/Loss পেজ দেখুন।", "Note: For full profit & expense view, see the Profit/Loss page.")}</p>
    </div>
  );
}

/* ---------------- Cash Closing ---------------- */
export function CashClosingTab({ shopId, tr, lang }: { shopId: string; tr: TR; lang: Lang }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!shopId) return;
    const start = `${date}T00:00:00`;
    const end = `${date}T23:59:59`;
    supabase.from("bottle_movements").select("type,qty,cash_collected,deposit_change").eq("shop_id", shopId).gte("occurred_at", start).lte("occurred_at", end)
      .then(({ data }) => setRows(data ?? []));
  }, [shopId, date]);

  const sums = useMemo(() => {
    const byType: Record<string, { qty: number; cash: number; deposit: number }> = {};
    let totalCash = 0, totalDeposit = 0, totalQty = 0;
    for (const r of rows) {
      const t = r.type;
      if (!byType[t]) byType[t] = { qty: 0, cash: 0, deposit: 0 };
      byType[t].qty += Number(r.qty || 0);
      byType[t].cash += Number(r.cash_collected || 0);
      byType[t].deposit += Number(r.deposit_change || 0);
      totalCash += Number(r.cash_collected || 0);
      totalDeposit += Number(r.deposit_change || 0);
      totalQty += Number(r.qty || 0);
    }
    return { byType, totalCash, totalDeposit, totalQty };
  }, [rows]);

  const LABELS: Record<string, string> = {
    sale_new: tr("নতুন বিক্রি", "New sale"),
    refill: tr("রিফিল", "Refill"),
    return_empty: tr("খালি ফেরত", "Empty return"),
    return_full: tr("ভর্তি ফেরত", "Full return"),
    purchase_full: tr("ভর্তি কেনা", "Purchase full"),
    refill_factory: tr("কারখানা রিফিল", "Factory refill"),
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-3 flex items-end gap-2">
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1"><Label>{tr("তারিখ বাছাই করুন", "Pick date")}</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-3"><div className="text-xs text-muted-foreground">{tr("মোট লেনদেন", "Total movements")}</div><div className="mt-1 text-xl font-bold tabular-nums">{bnNum(String(rows.length))}</div></div>
        <div className="rounded-xl border bg-card p-3"><div className="text-xs text-muted-foreground">{tr("মোট সংখ্যা", "Total bottles")}</div><div className="mt-1 text-xl font-bold tabular-nums">{bnNum(String(sums.totalQty))}</div></div>
        <div className="rounded-xl border bg-card p-3"><div className="text-xs text-muted-foreground">{tr("মোট নগদ", "Total cash")}</div><div className="mt-1 text-xl font-bold tabular-nums text-emerald-700">{fmtMoney(sums.totalCash, lang)}</div></div>
        <div className="rounded-xl border bg-card p-3"><div className="text-xs text-muted-foreground">{tr("জামানত পরিবর্তন", "Deposit change")}</div><div className={`mt-1 text-xl font-bold tabular-nums ${sums.totalDeposit > 0 ? "text-emerald-700" : sums.totalDeposit < 0 ? "text-rose-700" : ""}`}>{fmtMoney(sums.totalDeposit, lang)}</div></div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr><th className="px-3 py-2 text-left">{tr("ধরন", "Type")}</th><th className="px-3 py-2 text-right">{tr("সংখ্যা", "Qty")}</th><th className="px-3 py-2 text-right">{tr("নগদ", "Cash")}</th><th className="px-3 py-2 text-right">{tr("জামানত", "Deposit")}</th></tr>
          </thead>
          <tbody>
            {Object.keys(sums.byType).length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">{tr("এই দিনের কোনো লেনদেন নেই", "No movements on this date")}</td></tr>}
            {Object.entries(sums.byType).map(([t, v]) => (
              <tr key={t} className="border-t">
                <td className="px-3 py-2">{LABELS[t] || t}</td>
                <td className="px-3 py-2 text-right tabular-nums">{bnNum(String(v.qty))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(v.cash, lang)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(v.deposit, lang)}</td>
              </tr>
            ))}
          </tbody>
          {Object.keys(sums.byType).length > 0 && (
            <tfoot className="border-t bg-muted/30 font-semibold">
              <tr>
                <td className="px-3 py-2">{tr("মোট", "Total")}</td>
                <td className="px-3 py-2 text-right tabular-nums">{bnNum(String(sums.totalQty))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(sums.totalCash, lang)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(sums.totalDeposit, lang)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}