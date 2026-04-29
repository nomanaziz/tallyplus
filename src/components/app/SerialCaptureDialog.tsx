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
import { Hash, Sparkles, X, Save, ChevronLeft, ChevronRight } from "lucide-react";
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

export function SerialCaptureDialog({
  open, onOpenChange, productId, productName, qty,
  costPrice = 0, warrantyUntil = null, onSaved,
}: Props) {
  const { lang } = useI18n();
  const { current } = useShop();

  // Range mode
  const [prefix, setPrefix] = useState("");
  const [start, setStart] = useState("1");
  const [pad, setPad] = useState("2");

  // Manual mode (paginated batches of 50)
  const [manualVals, setManualVals] = useState<string[]>([]);
  const [batchIdx, setBatchIdx] = useState(0);

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPrefix(""); setStart("1"); setPad("2");
      setManualVals(Array.from({ length: qty }, () => ""));
      setBatchIdx(0);
    }
  }, [open, qty]);

  const totalBatches = Math.max(1, Math.ceil(qty / BATCH_LIMIT));
  const batchStart = batchIdx * BATCH_LIMIT;
  const batchEnd = Math.min(qty, batchStart + BATCH_LIMIT);

  const rangePreview = useMemo(() => {
    const s = Number(start) || 0;
    const p = Math.max(1, Number(pad) || 1);
    return Array.from({ length: Math.min(qty, 5) }, (_, i) =>
      `${prefix}${String(s + i).padStart(p, "0")}`
    );
  }, [prefix, start, pad, qty]);

  async function bulkInsert(serials: string[]) {
    if (!current || !productId) return;
    // chunked insert (200 per call) to keep payloads sane
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

  async function saveRange() {
    if (!prefix.trim() && !start.trim()) {
      toast.error(lang === "bn" ? "প্রিফিক্স অথবা শুরু নম্বর দিন" : "Enter prefix or start number");
      return;
    }
    const s = Number(start) || 0;
    const p = Math.max(1, Number(pad) || 1);
    const serials = Array.from({ length: qty }, (_, i) => `${prefix}${String(s + i).padStart(p, "0")}`);
    setBusy(true);
    try {
      const n = await bulkInsert(serials);
      toast.success(lang === "bn" ? `${n}টি সিরিয়াল সেভ হয়েছে` : `${n} serials saved`);
      onSaved?.(n ?? 0);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  async function saveManual() {
    const cleaned = manualVals.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      toast.error(lang === "bn" ? "অন্তত একটি সিরিয়াল দিন" : "Enter at least one serial");
      return;
    }
    // dedupe
    const seen = new Set<string>();
    const dups: string[] = [];
    for (const s of cleaned) { if (seen.has(s)) dups.push(s); seen.add(s); }
    if (dups.length) {
      toast.error((lang === "bn" ? "ডুপ্লিকেট: " : "Duplicate: ") + dups.slice(0, 3).join(", "));
      return;
    }
    setBusy(true);
    try {
      const n = await bulkInsert(Array.from(seen));
      toast.success(lang === "bn" ? `${n}টি সিরিয়াল সেভ হয়েছে` : `${n} serials saved`);
      onSaved?.(n ?? 0);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            {lang === "bn" ? "সিরিয়াল / IMEI যোগ করুন" : "Add Serials / IMEI"}
          </DialogTitle>
          <DialogDescription>
            {productName} • {qty} {lang === "bn" ? "ইউনিট" : "units"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="range" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="range">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              {lang === "bn" ? "রেঞ্জ" : "Range"}
            </TabsTrigger>
            <TabsTrigger value="manual">{lang === "bn" ? "ম্যানুয়াল" : "Manual"}</TabsTrigger>
            <TabsTrigger value="skip">{lang === "bn" ? "পরে" : "Skip"}</TabsTrigger>
          </TabsList>

          {/* Range mode */}
          <TabsContent value="range" className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">
              {lang === "bn"
                ? "একই প্রিফিক্স, শুধু শেষের কয়েক ডিজিট পরিবর্তন হয়। উদাহরণ: 354897109876541, 542, 543…"
                : "Same prefix, last digits change. e.g. 354897109876541, 542, 543…"}
            </p>
            <div className="grid gap-2">
              <Label className="text-xs">{lang === "bn" ? "প্রিফিক্স (একই অংশ)" : "Prefix (common part)"}</Label>
              <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="3548971098765" className="font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-xs">{lang === "bn" ? "শুরু নম্বর" : "Start number"}</Label>
                <Input value={start} onChange={(e) => setStart(e.target.value)} placeholder="41" className="font-mono" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">{lang === "bn" ? "প্যাড দৈর্ঘ্য" : "Pad length"}</Label>
                <Input value={pad} onChange={(e) => setPad(e.target.value)} placeholder="2" className="font-mono" />
              </div>
            </div>
            <div className="rounded border bg-muted/30 p-2">
              <div className="text-[11px] font-bold text-muted-foreground">{lang === "bn" ? "প্রিভিউ" : "Preview"}</div>
              <ul className="mt-1 space-y-0.5 font-mono text-xs">
                {rangePreview.map((s, i) => <li key={i}>{i + 1}. {s}</li>)}
                {qty > 5 && <li className="text-muted-foreground">… +{qty - 5} {lang === "bn" ? "আরও" : "more"}</li>}
              </ul>
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" className="h-10 gap-2 flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />{lang === "bn" ? "বাতিল" : "Cancel"}
              </Button>
              <Button className="h-10 gap-2 flex-1 sm:flex-none" onClick={saveRange} disabled={busy}>
                <Save className="h-4 w-4" />{busy ? "…" : (lang === "bn" ? `${qty}টি জেনারেট করুন` : `Generate ${qty}`)}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Manual mode */}
          <TabsContent value="manual" className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {lang === "bn"
                  ? `প্রতিটির আলাদা সিরিয়াল লিখুন। ব্যাচ ${batchIdx + 1}/${totalBatches} (${batchStart + 1}–${batchEnd})`
                  : `Enter each serial. Batch ${batchIdx + 1}/${totalBatches} (${batchStart + 1}–${batchEnd})`}
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
              placeholder={lang === "bn" ? "একসাথে অনেকগুলো paste করুন (এক লাইনে একটি)" : "Paste many at once (one per line)"}
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
                      placeholder={lang === "bn" ? "IMEI/সিরিয়াল" : "IMEI/Serial"}
                      className="h-9 font-mono"
                    />
                  </div>
                );
              })}
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" className="h-10 gap-2 flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />{lang === "bn" ? "বাতিল" : "Cancel"}
              </Button>
              <Button className="h-10 gap-2 flex-1 sm:flex-none" onClick={saveManual} disabled={busy}>
                <Save className="h-4 w-4" />{busy ? "…" : (lang === "bn" ? "সংরক্ষণ" : "Save all")}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Skip */}
          <TabsContent value="skip" className="space-y-3 pt-3">
            <p className="text-sm">
              {lang === "bn"
                ? "স্টক যোগ হবে কিন্তু সিরিয়াল এখন সেভ হবে না। পরে \"সিরিয়াল ম্যানেজ\" থেকে যোগ করতে পারবেন।"
                : "Stock will be added but no serials saved now. You can add them later from \"Manage Serials\"."}
            </p>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" className="h-10 gap-2 flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />{lang === "bn" ? "বাতিল" : "Cancel"}
              </Button>
              <Button className="h-10 gap-2 flex-1 sm:flex-none" onClick={() => { onSaved?.(0); onOpenChange(false); }}>
                {lang === "bn" ? "পরে যোগ করব" : "I'll add later"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}