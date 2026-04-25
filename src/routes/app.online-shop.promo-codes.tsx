import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, bnNum } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Tag, Copy, MoreVertical, RefreshCw, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/app/online-shop/promo-codes")({
  head: () => ({ meta: [{ title: "Promo Code — Tally Plus" }] }),
  component: PromoCodesPage,
});

type Promo = {
  id: string; code: string; discount_type: string; discount_value: number;
  min_order_amount: number; expires_at: string | null; is_active: boolean;
};

function PromoCodesPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const qc = useQueryClient();
  const shopId = current?.id ?? null;
  const [open, setOpen] = useState(false);

  const { data: codes = [], refetch, isFetching } = useQuery({
    queryKey: ["promo-codes", shopId],
    enabled: !!shopId,
    queryFn: async () => {
      const { data } = await supabase.from("promo_codes").select("id,code,discount_type,discount_value,min_order_amount,expires_at,is_active")
        .eq("shop_id", shopId!).order("created_at", { ascending: false });
      return (data ?? []) as Promo[];
    },
  });

  const toggle = async (id: string, val: boolean) => {
    await supabase.from("promo_codes").update({ is_active: val }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["promo-codes", shopId] });
  };
  const remove = async (id: string) => {
    if (!confirm(lang === "bn" ? "মুছে ফেলবেন?" : "Delete?")) return;
    await supabase.from("promo_codes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["promo-codes", shopId] });
  };
  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); toast.success(lang === "bn" ? "কপি হয়েছে" : "Copied"); } catch { /* noop */ }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 pb-24">
      <PageHeader breadcrumb="Online-shop" title="" />
      <div className="mt-3 rounded-xl border bg-muted/40 p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">
            {lang === "bn" ? "প্রোমো কোড" : "Promo Code"} ({lang === "bn" ? bnNum(codes.length) : codes.length})
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {lang === "bn" ? "রিফ্রেশ" : "Refresh"}
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {codes.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {lang === "bn" ? "এখনও কোনো প্রোমো কোড নেই" : "No promo codes yet"}
            </div>
          )}
          {codes.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-lg border-l-4 border-emerald-500 bg-card shadow-sm">
              <div className="flex items-start justify-between p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="font-bold">{p.code}</span>
                    <button onClick={() => copy(p.code)} className="text-muted-foreground hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${p.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">{lang === "bn" ? "ছাড়" : "Discount"}</div>
                      <div className="font-bold text-primary">
                        {p.discount_type === "percent" ? `${p.discount_value}%` : `৳ ${p.discount_value}`}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{lang === "bn" ? "ন্যূনতম ক্রয়" : "Min Purchase"}</div>
                      <div className="font-bold">৳ {p.min_order_amount}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-muted-foreground">{lang === "bn" ? "মেয়াদ" : "Expires"}</div>
                      <div className="font-bold">{p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "—"}</div>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><button className="p-1"><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => remove(p.id)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />{lang === "bn" ? "মুছুন" : "Delete"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2">
                <span className="text-xs">{lang === "bn" ? "প্রোমো কোড সক্রিয় করুন" : "Activate Promo Code"}</span>
                <Switch checked={p.is_active} onCheckedChange={(v) => toggle(p.id, v)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-3">
        <div className="mx-auto max-w-3xl">
          <Button className="w-full" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />{lang === "bn" ? "প্রোমো কোড যোগ" : "Add Promo Code"}
          </Button>
        </div>
      </div>

      {shopId && <AddPromoDialog open={open} onOpenChange={setOpen} shopId={shopId} lang={lang}
        onCreated={() => qc.invalidateQueries({ queryKey: ["promo-codes", shopId] })} />}
    </div>
  );
}

function AddPromoDialog({ open, onOpenChange, shopId, lang, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; shopId: string; lang: string; onCreated: () => void }) {
  const [code, setCode] = useState("");
  const [type, setType] = useState("percent");
  const [value, setValue] = useState("");
  const [minAmt, setMinAmt] = useState("");
  const [exp, setExp] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const reset = () => { setCode(""); setType("percent"); setValue(""); setMinAmt(""); setExp(""); setActive(true); };

  const submit = async () => {
    const c = code.trim().toUpperCase();
    if (!c) { toast.error(lang === "bn" ? "কোড দিন" : "Enter code"); return; }
    const v = Number(value);
    if (!v || v <= 0) { toast.error(lang === "bn" ? "ছাড় দিন" : "Enter discount"); return; }
    setSaving(true);
    const { error } = await supabase.from("promo_codes").insert({
      shop_id: shopId, code: c, discount_type: type, discount_value: v,
      min_order_amount: Number(minAmt) || 0,
      expires_at: exp ? new Date(exp).toISOString() : null,
      is_active: active,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(lang === "bn" ? "যোগ হয়েছে" : "Added");
    reset(); onOpenChange(false); onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{lang === "bn" ? "প্রোমো কোড যোগ" : "Add Promo Code"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{lang === "bn" ? "কোড নাম" : "Promo Code Name"}</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="EG. SUMMER10, NEWYEAR25" maxLength={32} /></div>
          <div><Label>{lang === "bn" ? "ছাড়ের ধরন" : "Discount Type"}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">{lang === "bn" ? "শতাংশ" : "Percentage"}</SelectItem>
                <SelectItem value="amount">{lang === "bn" ? "নির্দিষ্ট অঙ্ক" : "Fixed Amount"}</SelectItem>
              </SelectContent>
            </Select></div>
          <div><Label>{lang === "bn" ? "ছাড়ের পরিমাণ" : "Discount Amount"}</Label>
            <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="eg. 10, 25, 50" /></div>
          <div><Label>{lang === "bn" ? "ন্যূনতম ক্রয়" : "Minimum Purchase Amount"}</Label>
            <Input type="number" value={minAmt} onChange={(e) => setMinAmt(e.target.value)} placeholder="eg. 500, 1000, 2000" /></div>
          <div><Label>{lang === "bn" ? "মেয়াদ শেষ" : "Expiry Date"}</Label>
            <Input type="date" value={exp} onChange={(e) => setExp(e.target.value)} /></div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <span className="text-sm">{lang === "bn" ? "প্রোমো কোড সক্রিয়" : "Activate Promo Code"}</span>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{lang === "bn" ? "বাতিল" : "Cancel"}</Button>
          <Button onClick={submit} disabled={saving}>{lang === "bn" ? "যোগ" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}