import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { Hash, Sparkles, Shuffle, X, Save, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const BATCH_LIMIT = 50;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string | null;
  productName: string;
  qty: number;
  costPrice?: number;
  warrantyUntil?: string | null;
  onSaved?: (count: number) => void;
};

/** Split a serial like "350123456789001" into ("350123456789", "001"). */
function splitTrailingDigits(s: string): { prefix: string; tail: string } {
  const m = s.match(/^(.*?)(\d+)$/);
  if (!m) return { prefix: s, tail: "" };
  return { prefix: m[1], tail: m[2] };
}

/** Build serial from prefix + numeric value padded to tailLen. */
function buildSerial(prefix: string, num: number, tailLen: number): string {
  return `${prefix}${String(num).padStart(tailLen, "0")}`;
}

export function SerialCaptureDialog({
  open, onOpenChange, productId, productName, qty,
  costPrice = 0, warrantyUntil = null, onSaved,
}: Props) {
  const { lang, t } = useI18n();
  const { current } = useShop();

  // ===== Sequential mode (Start → End) =====
  const [startSerial, setStartSerial] = useState("");
  const [endSerial, setEndSerial] = useState("");
  const [endTouched, setEndTouched] = useState(false);

  // ===== Random mode (one-by-one, paginated batches of 50) =====
  const [manualVals, setManualVals] = useState<string[]>([]);
  const [batchIdx, setBatchIdx] = useState(0);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setStartSerial(""); setEndSerial(""); setEndTouched(false);
      setManualVals(Array.from({ length: qty }, () => ""));
      setBatchIdx(0);
    }
  }, [open, qty]);

  // Auto-fill End from Start whenever Start changes (until user manually edits End)
  useEffect(() => {
    if (endTouched) return;
    const { prefix, tail } = splitTrailingDigits(startSerial.trim());
    if (!tail) { setEndSerial(""); return; }
    const startNum = parseInt(tail, 10);
    const endNum = startNum + Math.max(0, qty - 1);
    setEndSerial(buildSerial(prefix, endNum, tail.length));
  }, [startSerial, qty, endTouched]);

  // ===== Sequential validation =====
  const seqInfo = useMemo(() => {
    const startTrim = startSerial.trim();
    const endTrim = endSerial.trim();
    if (!startTrim) return { ok: false, error: null as string | null, count: 0, preview: [] as string[] };

    const { prefix: pStart, tail: tStart } = splitTrailingDigits(startTrim);
    if (!tStart) {
      return { ok: false, error: t("p7_Start_serial_must_end_with_dig"), count: 0, preview: [] };
    }
    if (!endTrim) {
      return { ok: false, error: t("p7_Enter_end_serial"), count: 0, preview: [] };
    }
    const { prefix: pEnd, tail: tEnd } = splitTrailingDigits(endTrim);
    if (pStart !== pEnd) {
      return { ok: false, error: lang === "bn"
        ? `প্রিফিক্স মেলেনি — দুটোই "${pStart}" দিয়ে শুরু হতে হবে`
        : `Prefix mismatch — both must start with "${pStart}"`, count: 0, preview: [] };
    }
    const sNum = parseInt(tStart, 10);
    const eNum = parseInt(tEnd, 10);
    if (eNum < sNum) {
      return { ok: false, error: t("p7_End_must_be_greater_than_start"), count: 0, preview: [] };
    }
    const count = eNum - sNum + 1;
    const tailLen = Math.max(tStart.length, tEnd.length);
    const previewCount = Math.min(count, 4);
    const preview = Array.from({ length: previewCount }, (_, i) => buildSerial(pStart, sNum + i, tailLen));
    if (count > previewCount) preview.push("…", buildSerial(pStart, eNum, tailLen));
    return { ok: true, error: null, count, preview, prefix: pStart, startNum: sNum, endNum: eNum, tailLen };
  }, [startSerial, endSerial, lang]);

  const qtyMismatch = seqInfo.ok && seqInfo.count !== qty;

  // ===== Persistence =====
  async function bulkInsert(serials: string[]) {
    if (!current || !productId) return 0;
    const chunks: string[][] = [];
    for (let i = 0; i < serials.length; i += 200) chunks.push(serials.slice(i, i + 200));
    let inserted = 0;
    for (const c of chunks) {
      const payload = c.map((sn) => ({
        shop_id: current.id,
        product_id: productId,
        serial_no: sn,
        cost_price: costPrice || 0,
        warranty_until: warrantyUntil || null,
        status: "in_stock" as const,
      }));
      const { error } = await supabase.from("product_serials").insert(payload);
      if (error) throw error;
      inserted += c.length;
    }
    return inserted;
  }

  async function saveSequential() {
    if (!seqInfo.ok || seqInfo.count === 0) {
      toast.error(seqInfo.error || (t("p7_Enter_a_valid_range")));
      return;
    }
    if (qtyMismatch) {
      const proceed = confirm(lang === "bn"
        ? `স্টক ${qty} কিন্তু রেঞ্জ ${seqInfo.count}টি সিরিয়াল তৈরি করবে। চালিয়ে যাবেন?`
        : `Stock is ${qty} but range will create ${seqInfo.count} serials. Continue?`);
      if (!proceed) return;
    }
    const serials = Array.from({ length: seqInfo.count! }, (_, i) =>
      buildSerial(seqInfo.prefix!, seqInfo.startNum! + i, seqInfo.tailLen!)
    );
    setBusy(true);
    try {
      const n = await bulkInsert(serials);
      toast.success(lang === "bn" ? `${n}টি সিরিয়াল সেভ হয়েছে` : `${n} serials saved`);
      onSaved?.(n);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  async function saveRandom() {
    const cleaned = manualVals.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      toast.error(t("p7_Enter_at_least_one_serial"));
      return;
    }
    const seen = new Set<string>();
    const dups: string[] = [];
    for (const s of cleaned) { if (seen.has(s)) dups.push(s); seen.add(s); }
    if (dups.length) {
      toast.error((t("p7_Duplicate")) + dups.slice(0, 3).join(", "));
      return;
    }
    setBusy(true);
    try {
      const n = await bulkInsert(Array.from(seen));
      toast.success(lang === "bn" ? `${n}টি সিরিয়াল সেভ হয়েছে` : `${n} serials saved`);
      onSaved?.(n);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  function pasteIntoBatch(text: string) {
    const lines = text.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean);
    setManualVals((prev) => {
      const next = [...prev];
      for (let i = 0; i < lines.length && batchStart + i < qty; i++) {
        next[batchStart + i] = lines[i];
      }
      return next;
    });
  }

  const totalBatches = Math.max(1, Math.ceil(qty / BATCH_LIMIT));
  const batchStart = batchIdx * BATCH_LIMIT;
  const batchEnd = Math.min(qty, batchStart + BATCH_LIMIT);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            {t("p7_Add_Serials_IMEI")}
          </DialogTitle>
          <DialogDescription>
            {productName} • {qty} {t("p7_units")}
          </DialogDescription>
        </DialogHeader>

        {/* Quantity reminder banner */}
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          {lang === "bn"
            ? `এই পণ্যের জন্য ${qty}টি IMEI/সিরিয়াল প্রয়োজন।`
            : `This product needs ${qty} IMEI/Serial entries.`}
        </div>

        <Tabs defaultValue="sequential" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sequential">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              {t("p7_Sequential")}
            </TabsTrigger>
            <TabsTrigger value="random">
              <Shuffle className="mr-1 h-3.5 w-3.5" />
              {t("p7_Random")}
            </TabsTrigger>
            <TabsTrigger value="skip">{t("p7_Skip")}</TabsTrigger>
          </TabsList>

          {/* ============ Sequential (Start → End) ============ */}
          <TabsContent value="sequential" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">
              {t("p7_Sequential_serials_sharing_a_p")}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">{t("p7_Start_IMEI_Serial")}</Label>
                <Input
                  value={startSerial}
                  onChange={(e) => setStartSerial(e.target.value)}
                  placeholder="350123456789001"
                  className="font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  {t("p7_Must_end_with_digits_e_g_001")}
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">{t("p7_End_IMEI_Serial")}</Label>
                <Input
                  value={endSerial}
                  onChange={(e) => { setEndSerial(e.target.value); setEndTouched(true); }}
                  placeholder="350123456789010"
                  className="font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  {endTouched
                    ? (t("p7_Manually_edited"))
                    : (t("p7_Auto_filled_from_stock_qty"))}
                </p>
              </div>
            </div>

            {/* Validation feedback */}
            {seqInfo.error && (
              <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{seqInfo.error}</span>
              </div>
            )}
            {seqInfo.ok && (
              <div className={`flex items-start gap-2 rounded-md border p-2 text-xs ${qtyMismatch ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                {qtyMismatch ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                <div className="min-w-0">
                  <div className="font-semibold">
                    {qtyMismatch
                      ? (lang === "bn"
                          ? `স্টক ${qty} কিন্তু রেঞ্জ ${seqInfo.count}টি তৈরি করবে`
                          : `Stock is ${qty} but range produces ${seqInfo.count}`)
                      : (lang === "bn"
                          ? `${seqInfo.count}টি সিরিয়াল তৈরি হবে ✓`
                          : `${seqInfo.count} serials will be generated ✓`)}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[11px] opacity-80">{seqInfo.preview.join(", ")}</div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" className="h-10 gap-2 flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />{t("p7_Cancel")}
              </Button>
              <Button className="h-10 gap-2 flex-1 sm:flex-none" onClick={saveSequential} disabled={busy || !seqInfo.ok}>
                <Save className="h-4 w-4" />{busy ? "…" : (lang === "bn" ? `${seqInfo.count || qty}টি জেনারেট` : `Generate ${seqInfo.count || qty}`)}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* ============ Random (one-by-one) ============ */}
          <TabsContent value="random" className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {lang === "bn"
                  ? `প্রতিটির আলাদা IMEI/সিরিয়াল লিখুন। ব্যাচ ${batchIdx + 1}/${totalBatches} (${batchStart + 1}–${batchEnd})`
                  : `Enter each IMEI/Serial separately. Batch ${batchIdx + 1}/${totalBatches} (${batchStart + 1}–${batchEnd})`}
              </p>
              {totalBatches > 1 && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={batchIdx === 0} onClick={() => setBatchIdx((i) => i - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={batchIdx >= totalBatches - 1} onClick={() => setBatchIdx((i) => i + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <Textarea
              rows={2}
              placeholder={t("p7_Paste_many_at_once_one_per_lin")}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (text.includes("\n") || text.includes(",")) {
                  e.preventDefault();
                  pasteIntoBatch(text);
                }
              }}
            />
            <div className="grid gap-1.5 max-h-[40vh] overflow-y-auto pr-1">
              {manualVals.slice(batchStart, batchEnd).map((v, i) => {
                const realIdx = batchStart + i;
                return (
                  <div key={realIdx} className="flex items-center gap-2">
                    <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">{realIdx + 1}.</span>
                    <Input
                      value={v}
                      onChange={(e) => setManualVals((arr) => { const n = [...arr]; n[realIdx] = e.target.value; return n; })}
                      placeholder={t("p7_IMEI_Serial")}
                      className="h-9 font-mono"
                    />
                  </div>
                );
              })}
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" className="h-10 gap-2 flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />{t("p7_Cancel")}
              </Button>
              <Button className="h-10 gap-2 flex-1 sm:flex-none" onClick={saveRandom} disabled={busy}>
                <Save className="h-4 w-4" />{busy ? "…" : (t("p7_Save_all"))}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* ============ Skip ============ */}
          <TabsContent value="skip" className="space-y-3 pt-3">
            <p className="text-sm">
              {t("p7_Stock_will_be_added_but_no_ser")}
            </p>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" className="h-10 gap-2 flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />{t("p7_Cancel")}
              </Button>
              <Button className="h-10 gap-2 flex-1 sm:flex-none" onClick={() => { onSaved?.(0); onOpenChange(false); }}>
                {t("p7_I_ll_add_later")}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}