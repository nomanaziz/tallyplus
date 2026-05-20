import { useEffect, useMemo, useState } from "react";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney, bnNum } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Flame, Droplet, Truck, Wallet, Plus, RefreshCw, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

type BottleType = {
  id: string; name: string; size_label: string | null;
  purchase_price: number; sale_price: number; deposit_amount: number; is_active: boolean;
};
type Movement = {
  id: string; bottle_type_id: string; contact_id: string | null; type: string;
  qty: number; cash_collected: number; deposit_change: number; note: string | null; occurred_at: string;
};
type Holding = {
  contact_id: string; bottle_type_id: string; qty: number; deposit_held: number; last_movement_at: string | null;
};
type Contact = { id: string; name: string; phone: string | null };
type DeliveryMan = { id: string; name: string; phone: string | null; vehicle_no: string | null; is_active: boolean };

const TYPE_LABELS_BN: Record<string, string> = {
  sale_new: "নতুন বিক্রি",
  refill: "রিফিল (খালি ফেরত + ভর্তি দিল)",
  return_empty: "শুধু খালি ফেরত",
  return_full: "ভর্তি ফেরত",
  purchase_full: "ভর্তি কেনা",
  refill_factory: "কারখানা থেকে রিফিল",
};
const TYPE_LABELS_EN: Record<string, string> = {
  sale_new: "New Sale",
  refill: "Refill (return empty + give full)",
  return_empty: "Return empty only",
  return_full: "Return full",
  purchase_full: "Purchase full",
  refill_factory: "Factory refill",
};

export default function LpgPage() {
  const { current } = useShop();
  const { lang } = useI18n();
  const tr = (bn: string, en: string) => (lang === "bn" ? bn : en);

  const [types, setTypes] = useState<BottleType[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deliveryMen, setDeliveryMen] = useState<DeliveryMan[]>([]);
  const [tick, setTick] = useState(0);
  const reload = () => setTick((t) => t + 1);

  // Dialogs
  const [moveOpen, setMoveOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);

  useEffect(() => {
    if (!current?.id) return;
    let cancelled = false;
    (async () => {
      const [t, m, h, c, d] = await Promise.all([
        supabase.from("bottle_types").select("*").eq("shop_id", current.id).order("created_at"),
        supabase.from("bottle_movements").select("*").eq("shop_id", current.id).order("occurred_at", { ascending: false }).limit(200),
        supabase.from("bottle_holdings").select("*").eq("shop_id", current.id).gt("qty", 0),
        supabase.from("customers").select("id,name,phone").eq("shop_id", current.id).order("name"),
        supabase.from("delivery_men").select("*").eq("shop_id", current.id).order("name"),
      ]);
      if (cancelled) return;
      setTypes((t.data ?? []) as BottleType[]);
      setMovements((m.data ?? []) as Movement[]);
      setHoldings((h.data ?? []) as Holding[]);
      setContacts((c.data ?? []) as Contact[]);
      setDeliveryMen((d.data ?? []) as DeliveryMan[]);
    })();
    return () => { cancelled = true; };
  }, [current?.id, tick]);

  // Stock summary per bottle type
  const stockSummary = useMemo(() => {
    const out = new Map<string, { full: number; empty: number; out: number }>();
    for (const t of types) out.set(t.id, { full: 0, empty: 0, out: 0 });
    for (const m of movements) {
      const s = out.get(m.bottle_type_id);
      if (!s) continue;
      // Track inventory deltas based on movement type.
      // full stock = full bottles physically at shop.
      // empty stock = empty bottles at shop.
      // out = bottles in customer hands (sum of holdings).
      switch (m.type) {
        case "purchase_full": s.full += m.qty; break;
        case "refill_factory": s.empty -= m.qty; s.full += m.qty; break;
        case "sale_new": s.full -= m.qty; s.out += m.qty; break;
        case "refill": s.full -= m.qty; s.empty += m.qty; break; // gave full, got empty back, customer holding unchanged
        case "return_empty": s.empty += m.qty; s.out -= m.qty; break;
        case "return_full": s.full += m.qty; s.out -= m.qty; break;
      }
    }
    return out;
  }, [types, movements]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCash = movements.filter((m) => m.occurred_at.slice(0, 10) === todayStr).reduce((a, m) => a + Number(m.cash_collected || 0), 0);
  const todayRefill = movements.filter((m) => m.occurred_at.slice(0, 10) === todayStr && (m.type === "refill" || m.type === "sale_new")).reduce((a, m) => a + m.qty, 0);
  const totalDeposit = holdings.reduce((a, h) => a + Number(h.deposit_held || 0), 0);
  const totalOut = holdings.reduce((a, h) => a + h.qty, 0);

  // Top due customers (by qty out)
  const topDue = useMemo(() => {
    const m = new Map<string, { qty: number; deposit: number }>();
    for (const h of holdings) {
      const cur = m.get(h.contact_id) ?? { qty: 0, deposit: 0 };
      cur.qty += h.qty; cur.deposit += Number(h.deposit_held || 0);
      m.set(h.contact_id, cur);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
  }, [holdings]);

  const contactName = (id: string | null) => contacts.find((c) => c.id === id)?.name ?? "—";
  const typeName = (id: string) => {
    const t = types.find((x) => x.id === id);
    if (!t) return "—";
    return t.name + (t.size_label ? ` (${t.size_label})` : "");
  };

  if (!current?.id) {
    return <div className="p-6 text-center text-sm text-muted-foreground">{tr("দোকান নির্বাচন করুন", "Select a shop")}</div>;
  }

  return (
    <div className="min-h-full bg-muted/20 p-3 md:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-rose-600 text-white shadow">
            <Flame className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-bold">{tr("LPG / বোতল ব্যবসা", "LPG / Bottle Business")}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reload}><RefreshCw className="mr-1.5 h-4 w-4" />{tr("রিফ্রেশ", "Refresh")}</Button>
          <Button size="sm" onClick={() => setMoveOpen(true)} disabled={types.length === 0}>
            <Plus className="mr-1.5 h-4 w-4" />{tr("নতুন এন্ট্রি", "New entry")}
          </Button>
        </div>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard icon={<Flame className="h-4 w-4" />} color="from-emerald-500 to-emerald-700" label={tr("মোট ভর্তি স্টক", "Full in stock")} value={bnNum(String(sumFull(stockSummary)), lang)} />
        <KpiCard icon={<Droplet className="h-4 w-4" />} color="from-sky-500 to-sky-700" label={tr("মোট খালি স্টক", "Empty in stock")} value={bnNum(String(sumEmpty(stockSummary)), lang)} />
        <KpiCard icon={<Truck className="h-4 w-4" />} color="from-amber-500 to-orange-600" label={tr("কাস্টমারের কাছে", "With customers")} value={bnNum(String(totalOut))} />
        <KpiCard icon={<Wallet className="h-4 w-4" />} color="from-violet-500 to-fuchsia-600" label={tr("আজকের ক্যাশ", "Today's cash")} value={fmtMoney(todayCash, lang)} sub={tr(`আজকের রিফিল ${bnNum(String(todayRefill))}`, `${todayRefill} refills today`)} />
      </div>

      <Tabs defaultValue="stock" className="mt-4">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="stock">{tr("স্টক", "Stock")}</TabsTrigger>
          <TabsTrigger value="moves">{tr("লেনদেন", "Movements")}</TabsTrigger>
          <TabsTrigger value="customers">{tr("গ্রাহকের বোতল", "Customer bottles")}</TabsTrigger>
          <TabsTrigger value="types">{tr("বোতলের ধরন", "Bottle types")}</TabsTrigger>
          <TabsTrigger value="delivery">{tr("ডেলিভারি ম্যান", "Delivery men")}</TabsTrigger>
        </TabsList>

        {/* STOCK */}
        <TabsContent value="stock" className="mt-3 space-y-3">
          {types.length === 0 ? (
            <EmptyHint
              title={tr("কোনো বোতলের ধরন যোগ করা হয়নি", "No bottle types yet")}
              hint={tr("শুরু করতে 'বোতলের ধরন' ট্যাব থেকে একটা ধরন যোগ করুন (যেমন: বসুন্ধরা ১২ কেজি, জীবন ১৯ লিটার)।", "Add a bottle type from the 'Bottle types' tab to get started.")}
              action={<Button size="sm" onClick={() => setTypeOpen(true)}><Plus className="mr-1.5 h-4 w-4" />{tr("ধরন যোগ", "Add type")}</Button>}
            />
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {types.map((t) => {
                const s = stockSummary.get(t.id) ?? { full: 0, empty: 0, out: 0 };
                return (
                  <div key={t.id} className="rounded-xl border bg-card p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{t.name}</div>
                        {t.size_label && <div className="text-xs text-muted-foreground">{t.size_label}</div>}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>{tr("জামানত", "Deposit")}: {fmtMoney(t.deposit_amount, lang)}</div>
                        <div>{tr("বিক্রয়", "Sale")}: {fmtMoney(t.sale_price, lang)}</div>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
                      <StockBadge label={tr("ভর্তি", "Full")} value={s.full} cls="bg-emerald-50 text-emerald-700" />
                      <StockBadge label={tr("খালি", "Empty")} value={s.empty} cls="bg-sky-50 text-sky-700" />
                      <StockBadge label={tr("বাইরে", "Out")} value={s.out} cls="bg-amber-50 text-amber-700" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {topDue.length > 0 && (
            <div className="rounded-xl border bg-card p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">{tr("শীর্ষ ৫ — কাস্টমারের কাছে বোতল", "Top 5 — bottles with customers")}</h3>
                <Badge variant="secondary">{tr(`মোট জামানত: ${fmtMoney(totalDeposit, lang)}`, `Total deposit: ${fmtMoney(totalDeposit, lang)}`)}</Badge>
              </div>
              <div className="divide-y">
                {topDue.map(([cid, v]) => (
                  <div key={cid} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium">{contactName(cid)}</span>
                    <span className="text-muted-foreground">{bnNum(String(v.qty))} {tr("টি", "pcs")} · {fmtMoney(v.deposit, lang)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* MOVEMENTS */}
        <TabsContent value="moves" className="mt-3">
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr><th className="px-3 py-2 text-left">{tr("তারিখ", "Date")}</th>
                    <th className="px-3 py-2 text-left">{tr("ধরন", "Type")}</th>
                    <th className="px-3 py-2 text-left">{tr("বোতল", "Bottle")}</th>
                    <th className="px-3 py-2 text-left">{tr("গ্রাহক", "Customer")}</th>
                    <th className="px-3 py-2 text-right">{tr("সংখ্যা", "Qty")}</th>
                    <th className="px-3 py-2 text-right">{tr("ক্যাশ", "Cash")}</th>
                    <th className="px-3 py-2 text-right">{tr("জামানত", "Deposit Δ")}</th></tr>
              </thead>
              <tbody>
                {movements.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">{tr("কোনো লেনদেন নেই", "No movements")}</td></tr>}
                {movements.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="px-3 py-2">{new Date(m.occurred_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                    <td className="px-3 py-2">{lang === "bn" ? TYPE_LABELS_BN[m.type] : TYPE_LABELS_EN[m.type]}</td>
                    <td className="px-3 py-2">{typeName(m.bottle_type_id)}</td>
                    <td className="px-3 py-2">{contactName(m.contact_id)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{bnNum(String(m.qty))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(m.cash_collected, lang)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${Number(m.deposit_change) > 0 ? "text-emerald-600" : Number(m.deposit_change) < 0 ? "text-rose-600" : ""}`}>{fmtMoney(m.deposit_change, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* HOLDINGS PER CUSTOMER */}
        <TabsContent value="customers" className="mt-3">
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr><th className="px-3 py-2 text-left">{tr("গ্রাহক", "Customer")}</th>
                    <th className="px-3 py-2 text-left">{tr("বোতল", "Bottle")}</th>
                    <th className="px-3 py-2 text-right">{tr("সংখ্যা", "Qty")}</th>
                    <th className="px-3 py-2 text-right">{tr("জামানত", "Deposit")}</th>
                    <th className="px-3 py-2 text-right">{tr("শেষ আপডেট", "Last")}</th></tr>
              </thead>
              <tbody>
                {holdings.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">{tr("কারো কাছে বোতল নেই", "No bottles out")}</td></tr>}
                {holdings.map((h, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 font-medium">{contactName(h.contact_id)}</td>
                    <td className="px-3 py-2">{typeName(h.bottle_type_id)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{bnNum(String(h.qty))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(h.deposit_held, lang)}</td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">{h.last_movement_at ? new Date(h.last_movement_at).toLocaleDateString("en-GB") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* BOTTLE TYPES */}
        <TabsContent value="types" className="mt-3 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setTypeOpen(true)}><Plus className="mr-1.5 h-4 w-4" />{tr("ধরন যোগ", "Add type")}</Button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {types.map((t) => (
              <div key={t.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    {t.size_label && <div className="text-xs text-muted-foreground">{t.size_label}</div>}
                  </div>
                  {!t.is_active && <Badge variant="secondary">{tr("নিষ্ক্রিয়", "Inactive")}</Badge>}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div><div className="text-muted-foreground">{tr("ক্রয়", "Buy")}</div><div className="font-semibold">{fmtMoney(t.purchase_price, lang)}</div></div>
                  <div><div className="text-muted-foreground">{tr("বিক্রয়", "Sell")}</div><div className="font-semibold">{fmtMoney(t.sale_price, lang)}</div></div>
                  <div><div className="text-muted-foreground">{tr("জামানত", "Deposit")}</div><div className="font-semibold">{fmtMoney(t.deposit_amount, lang)}</div></div>
                </div>
              </div>
            ))}
            {types.length === 0 && <div className="md:col-span-2 rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">{tr("এখনো কোনো ধরন নেই", "No bottle types yet")}</div>}
          </div>
        </TabsContent>

        {/* DELIVERY MEN */}
        <TabsContent value="delivery" className="mt-3 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setDmOpen(true)}><Plus className="mr-1.5 h-4 w-4" />{tr("ডেলিভারি ম্যান যোগ", "Add delivery man")}</Button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {deliveryMen.map((d) => (
              <div key={d.id} className="rounded-xl border bg-card p-3">
                <div className="font-semibold">{d.name}</div>
                <div className="text-xs text-muted-foreground">{d.phone ?? "—"} · {d.vehicle_no ?? tr("কোনো গাড়ি নেই", "no vehicle")}</div>
              </div>
            ))}
            {deliveryMen.length === 0 && <div className="md:col-span-2 rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">{tr("কোনো ডেলিভারি ম্যান নেই", "No delivery men yet")}</div>}
          </div>
        </TabsContent>
      </Tabs>

      <MovementDialog
        open={moveOpen} onOpenChange={setMoveOpen}
        types={types} contacts={contacts} deliveryMen={deliveryMen}
        shopId={current.id} onSaved={() => { setMoveOpen(false); reload(); }}
      />
      <BottleTypeDialog
        open={typeOpen} onOpenChange={setTypeOpen}
        shopId={current.id} onSaved={() => { setTypeOpen(false); reload(); }}
      />
      <DeliveryManDialog
        open={dmOpen} onOpenChange={setDmOpen}
        shopId={current.id} onSaved={() => { setDmOpen(false); reload(); }}
      />
    </div>
  );
}

function sumFull(m: Map<string, { full: number; empty: number; out: number }>) {
  let s = 0; for (const v of m.values()) s += v.full; return s;
}
function sumEmpty(m: Map<string, { full: number; empty: number; out: number }>) {
  let s = 0; for (const v of m.values()) s += v.empty; return s;
}

function KpiCard({ icon, color, label, value, sub }: { icon: React.ReactNode; color: string; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br ${color} text-white`}>{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
function StockBadge({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className={`rounded-md ${cls} px-2 py-1.5`}>
      <div className="text-[10px] uppercase">{label}</div>
      <div className="text-base font-bold tabular-nums">{value}</div>
    </div>
  );
}
function EmptyHint({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-card p-6 text-center">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}

/* ---------- Movement entry dialog ---------- */
function MovementDialog({
  open, onOpenChange, types, contacts, deliveryMen, shopId, onSaved,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  types: BottleType[]; contacts: Contact[]; deliveryMen: DeliveryMan[];
  shopId: string; onSaved: () => void;
}) {
  const { lang } = useI18n();
  const tr = (bn: string, en: string) => (lang === "bn" ? bn : en);
  const [tab, setTab] = useState<"sale_new" | "refill" | "return_empty" | "purchase_full">("refill");
  const [bottleId, setBottleId] = useState<string>("");
  const [contactId, setContactId] = useState<string>("");
  const [qty, setQty] = useState<string>("1");
  const [cash, setCash] = useState<string>("");
  const [deposit, setDeposit] = useState<string>("0");
  const [note, setNote] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setBottleId(types[0]?.id ?? "");
      setContactId("");
      setQty("1");
      setCash("");
      setDeposit("0");
      setNote("");
      setTab("refill");
    }
  }, [open, types]);

  // Auto-fill cash + deposit when bottle/qty/type changes
  useEffect(() => {
    const t = types.find((x) => x.id === bottleId);
    if (!t) return;
    const q = Number(qty || 0);
    if (tab === "sale_new") {
      setCash(String(t.sale_price * q));
      setDeposit(String(t.deposit_amount * q));
    } else if (tab === "refill") {
      setCash(String(t.sale_price * q));
      setDeposit("0");
    } else if (tab === "return_empty") {
      setCash("0");
      setDeposit(String(-t.deposit_amount * q));
    } else if (tab === "purchase_full") {
      setCash(String(t.purchase_price * q));
      setDeposit("0");
    }
  }, [tab, bottleId, qty, types]);

  const needsContact = tab !== "purchase_full";

  const save = async () => {
    if (!bottleId) return toast.error(tr("বোতলের ধরন বাছাই করুন", "Pick a bottle type"));
    if (needsContact && !contactId) return toast.error(tr("গ্রাহক বাছাই করুন", "Pick a customer"));
    const q = Number(qty);
    if (!q || q <= 0) return toast.error(tr("সংখ্যা ঠিক নয়", "Invalid quantity"));

    setBusy(true);
    const { error } = await supabase.from("bottle_movements").insert({
      shop_id: shopId,
      bottle_type_id: bottleId,
      contact_id: needsContact ? contactId : null,
      type: tab,
      qty: q,
      cash_collected: Number(cash || 0),
      deposit_change: Number(deposit || 0),
      note: note || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(tr("সংরক্ষিত হলো", "Saved"));
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{tr("বোতল লেনদেন", "Bottle movement")}</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="refill"><RefreshCw className="mr-1 h-3.5 w-3.5" />{tr("রিফিল", "Refill")}</TabsTrigger>
            <TabsTrigger value="sale_new">{tr("নতুন বিক্রি", "New Sale")}</TabsTrigger>
            <TabsTrigger value="return_empty"><ArrowDownToLine className="mr-1 h-3.5 w-3.5" />{tr("খালি ফেরত", "Empty")}</TabsTrigger>
            <TabsTrigger value="purchase_full"><ArrowUpFromLine className="mr-1 h-3.5 w-3.5" />{tr("কেনা", "Buy")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="space-y-3">
          <div>
            <Label>{tr("বোতলের ধরন", "Bottle type")}</Label>
            <Select value={bottleId} onValueChange={setBottleId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder={tr("বাছাই করুন", "Choose")} /></SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}{t.size_label ? ` (${t.size_label})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needsContact && (
            <div>
              <Label>{tr("গ্রাহক", "Customer")}</Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={tr("বাছাই করুন", "Choose")} /></SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>{tr("সংখ্যা", "Qty")}</Label>
              <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div>
              <Label>{tr("ক্যাশ", "Cash")}</Label>
              <Input type="number" value={cash} onChange={(e) => setCash(e.target.value)} />
            </div>
            <div>
              <Label>{tr("জামানত Δ", "Deposit Δ")}</Label>
              <Input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>{tr("নোট", "Note")}</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {deliveryMen.length > 0 && <p className="text-xs text-muted-foreground">{tr("ডেলিভারি ম্যান বাছাই করতে চাইলে এন্ট্রির পর ট্রিপ থেকে যোগ করতে পারবেন।", "You can attach a delivery man from the Trips view later.")}</p>}
          <Button className="w-full" onClick={save} disabled={busy}>{busy ? tr("সেভ হচ্ছে...", "Saving...") : tr("সংরক্ষণ", "Save")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Bottle type dialog ---------- */
function BottleTypeDialog({ open, onOpenChange, shopId, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; shopId: string; onSaved: () => void }) {
  const { lang } = useI18n();
  const tr = (bn: string, en: string) => (lang === "bn" ? bn : en);
  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [buy, setBuy] = useState("0");
  const [sell, setSell] = useState("0");
  const [dep, setDep] = useState("0");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setName(""); setSize(""); setBuy("0"); setSell("0"); setDep("0"); } }, [open]);

  const save = async () => {
    if (!name.trim()) return toast.error(tr("নাম দিন", "Enter name"));
    setBusy(true);
    const { error } = await supabase.from("bottle_types").insert({
      shop_id: shopId, name: name.trim(), size_label: size.trim() || null,
      purchase_price: Number(buy || 0), sale_price: Number(sell || 0), deposit_amount: Number(dep || 0),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(tr("সংরক্ষিত হলো", "Saved"));
    onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{tr("নতুন বোতলের ধরন", "New bottle type")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{tr("নাম (যেমন: বসুন্ধরা)", "Name (e.g. Bashundhara)")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>{tr("সাইজ (যেমন: ১২ কেজি)", "Size label (e.g. 12 kg)")}</Label><Input value={size} onChange={(e) => setSize(e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>{tr("ক্রয় মূল্য", "Buy")}</Label><Input type="number" value={buy} onChange={(e) => setBuy(e.target.value)} /></div>
            <div><Label>{tr("বিক্রয় মূল্য", "Sell")}</Label><Input type="number" value={sell} onChange={(e) => setSell(e.target.value)} /></div>
            <div><Label>{tr("জামানত", "Deposit")}</Label><Input type="number" value={dep} onChange={(e) => setDep(e.target.value)} /></div>
          </div>
          <Button className="w-full" onClick={save} disabled={busy}>{busy ? tr("সেভ...", "Saving...") : tr("সংরক্ষণ", "Save")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Delivery man dialog ---------- */
function DeliveryManDialog({ open, onOpenChange, shopId, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; shopId: string; onSaved: () => void }) {
  const { lang } = useI18n();
  const tr = (bn: string, en: string) => (lang === "bn" ? bn : en);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [veh, setVeh] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setName(""); setPhone(""); setVeh(""); } }, [open]);
  const save = async () => {
    if (!name.trim()) return toast.error(tr("নাম দিন", "Enter name"));
    setBusy(true);
    const { error } = await supabase.from("delivery_men").insert({
      shop_id: shopId, name: name.trim(), phone: phone.trim() || null, vehicle_no: veh.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(tr("সংরক্ষিত হলো", "Saved"));
    onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{tr("নতুন ডেলিভারি ম্যান", "New delivery man")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{tr("নাম", "Name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>{tr("ফোন", "Phone")}</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label>{tr("গাড়ি / ভ্যান নম্বর", "Vehicle no.")}</Label><Input value={veh} onChange={(e) => setVeh(e.target.value)} /></div>
          <Button className="w-full" onClick={save} disabled={busy}>{busy ? tr("সেভ...", "Saving...") : tr("সংরক্ষণ", "Save")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}