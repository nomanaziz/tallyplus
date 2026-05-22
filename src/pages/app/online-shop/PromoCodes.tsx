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



type Promo = {
  id: string; code: string; discount_type: string; discount_value: number;
  min_order_amount: number; expires_at: string | null; is_active: boolean;
};

function PromoCodesPage() {
  const { lang, t } = useI18n();
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
    if (!confirm(t("p6_Delete"))) return;
    await supabase.from("promo_codes").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["promo-codes", shopId] });
  };
  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); toast.success(t("p6_Copied")); } catch { /* noop */ }
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 pb-24">
      <PageHeader breadcrumb="Online-shop" title="" />
      <div className="mt-3 rounded-xl border bg-muted/40 p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">
            {t("p6_Promo_Code")} ({lang === "bn" ? bnNum(codes.length) : codes.length})
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {t("p6_Refresh")}
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {codes.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {t("p6_No_promo_codes_yet")}
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
                      <div className="text-muted-foreground">{t("p6_Discount")}</div>
                      <div className="font-bold text-primary">
                        {p.discount_type === "percent"
                          ? `${p.discount_value}%`
                          : p.discount_type === "free_shipping"
                          ? (t("p6_Free_Shipping"))
                          : `৳ ${p.discount_value}`}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">{t("p6_Min_Purchase")}</div>
                      <div className="font-bold">৳ {p.min_order_amount}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-muted-foreground">{t("p6_Expires")}</div>
                      <div className="font-bold">{p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "—"}</div>
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><button className="p-1"><MoreVertical className="h-4 w-4" /></button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => remove(p.id)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />{t("p6_Delete_2")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2">
                <span className="text-xs">{t("p6_Activate_Promo_Code")}</span>
                <Switch checked={p.is_active} onCheckedChange={(v) => toggle(p.id, v)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-3">
        <div className="mx-auto max-w-3xl">
          <Button className="w-full" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />{t("p6_Add_Promo_Code")}
          </Button>
        </div>
      </div>

      {shopId && <AddPromoDialog open={open} onOpenChange={setOpen} shopId={shopId} lang={lang}
        onCreated={() => qc.invalidateQueries({ queryKey: ["promo-codes", shopId] })} />}
    </div>
  );
}

function AddPromoDialog({ open, onOpenChange, shopId, lang, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; shopId: string; lang: string; onCreated: () => void }) {
  const { t } = useI18n();
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
    if (!c) { toast.error(t("p6_Enter_code")); return; }
    const isFreeShip = type === "free_shipping";
    const v = isFreeShip ? 0 : Number(value);
    if (!isFreeShip && (!v || v <= 0)) { toast.error(t("p6_Enter_discount")); return; }
    if (isFreeShip && (!minAmt || Number(minAmt) <= 0)) {
      toast.error(t("p6_Enter_minimum_order_amount")); return;
    }
    setSaving(true);
    const { error } = await supabase.from("promo_codes").insert({
      shop_id: shopId, code: c, discount_type: type, discount_value: v,
      min_order_amount: Number(minAmt) || 0,
      expires_at: exp ? new Date(exp).toISOString() : null,
      is_active: active,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("p6_Added"));
    reset(); onOpenChange(false); onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("p6_Add_Promo_Code")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>{t("p6_Promo_Code_Name")}</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="EG. SUMMER10, NEWYEAR25" maxLength={32} /></div>
          <div><Label>{t("p6_Discount_Type")}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">{t("p6_Percentage")}</SelectItem>
                <SelectItem value="amount">{t("p6_Fixed_Amount")}</SelectItem>
                <SelectItem value="free_shipping">{t("p6_Free_Shipping")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              {type === "percent" && (t("p6_Percentage_off_total_order"))}
              {type === "amount" && (t("p6_Fixed_amount_off_order_total"))}
              {type === "free_shipping" && (t("p6_Free_delivery_on_orders_above_"))}
            </p>
          </div>
          {type !== "free_shipping" && (
            <div><Label>{t("p6_Discount_Amount")}</Label>
              <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="eg. 10, 25, 50" /></div>
          )}
          <div><Label>{t("p6_Minimum_Purchase_Amount")} {type === "free_shipping" && <span className="text-destructive">*</span>}</Label>
            <Input type="number" value={minAmt} onChange={(e) => setMinAmt(e.target.value)} placeholder="eg. 500, 1000, 2000" /></div>
          <div><Label>{t("p6_Expiry_Date")}</Label>
            <Input type="date" value={exp} onChange={(e) => setExp(e.target.value)} /></div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <span className="text-sm">{t("p6_Activate_Promo_Code_2")}</span>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("p6_Cancel")}</Button>
          <Button onClick={submit} disabled={saving}>{t("p6_Add")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export default PromoCodesPage;
