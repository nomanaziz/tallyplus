import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, CalendarClock } from "lucide-react";

type Item = { name: string; qty: string; unit: string };
type Shop = { id: string; name: string };
type Recurrence = "monthly" | "weekly" | "once";

const WEEKDAYS = [
  { v: 0, label: "রবিবার" },
  { v: 1, label: "সোমবার" },
  { v: 2, label: "মঙ্গলবার" },
  { v: 3, label: "বুধবার" },
  { v: 4, label: "বৃহস্পতিবার" },
  { v: 5, label: "শুক্রবার" },
  { v: 6, label: "শনিবার" },
];

function nextRunForMonthly(day: number): Date {
  const now = new Date();
  const yr = now.getFullYear();
  const mo = now.getMonth();
  const lastOfMonth = new Date(yr, mo + 1, 0).getDate();
  const safeDay = Math.min(day, lastOfMonth);
  let candidate = new Date(yr, mo, safeDay, 9, 0, 0);
  if (candidate <= now) {
    const nextLast = new Date(yr, mo + 2, 0).getDate();
    candidate = new Date(yr, mo + 1, Math.min(day, nextLast), 9, 0, 0);
  }
  return candidate;
}
function nextRunForWeekly(weekday: number): Date {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(9, 0, 0, 0);
  const diff = (weekday - candidate.getDay() + 7) % 7;
  candidate.setDate(candidate.getDate() + (diff === 0 && candidate <= now ? 7 : diff));
  return candidate;
}

export function ScheduleFordoDialog({
  open,
  onOpenChange,
  items,
  note,
  preselectShopId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: Item[];
  note: string;
  preselectShopId?: string;
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState<string>(preselectShopId ?? "");
  const [recurrence, setRecurrence] = useState<Recurrence>("monthly");
  const [dayOfMonth, setDayOfMonth] = useState<number>(10);
  const [dayOfWeek, setDayOfWeek] = useState<number>(5);
  const [onceDate, setOnceDate] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    void (async () => {
      // Pull recently used shops from user's wishlists
      const { data: wls } = await supabase
        .from("customer_wishlists")
        .select("shop_id")
        .eq("consumer_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      const ids = Array.from(new Set((wls ?? []).map((w) => w.shop_id))).filter(Boolean);
      if (ids.length === 0) {
        setShops([]);
        return;
      }
      const { data: ss } = await supabase
        .from("shops")
        .select("id,name")
        .in("id", ids)
        .is("deleted_at", null);
      setShops((ss ?? []) as Shop[]);
      if (!shopId && ss && ss.length > 0) setShopId(ss[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const validItems = useMemo(
    () => items.filter((it) => it.name.trim()).map((it) => ({
      name: it.name.trim(),
      qty: it.qty || null,
      unit: it.unit || null,
    })),
    [items],
  );

  const save = async () => {
    if (!user) return toast.error("লগইন করুন");
    if (!shopId) return toast.error("দোকান নির্বাচন করুন");
    if (validItems.length === 0) return toast.error("অন্তত একটি পণ্য যোগ করুন");

    let nextRun: Date;
    let payload: Record<string, unknown> = {
      consumer_user_id: user.id,
      shop_id: shopId,
      items: validItems,
      note: note || null,
      recurrence,
      is_active: true,
    };
    if (recurrence === "monthly") {
      nextRun = nextRunForMonthly(dayOfMonth);
      payload.day_of_month = dayOfMonth;
    } else if (recurrence === "weekly") {
      nextRun = nextRunForWeekly(dayOfWeek);
      payload.day_of_week = dayOfWeek;
    } else {
      if (!onceDate) return toast.error("তারিখ নির্বাচন করুন");
      nextRun = new Date(onceDate);
      if (nextRun.getTime() <= Date.now()) return toast.error("ভবিষ্যতের তারিখ দিন");
      payload.run_at = nextRun.toISOString();
    }
    payload.next_run_at = nextRun.toISOString();

    setSaving(true);
    const { error } = await supabase.from("consumer_fordo_schedules").insert(payload as never);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("সময়সূচী সংরক্ষণ করা হয়েছে");
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" /> সময়সূচী সেট করুন
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>দোকান</Label>
            <Select value={shopId} onValueChange={setShopId}>
              <SelectTrigger>
                <SelectValue placeholder="দোকান বাছাই করুন" />
              </SelectTrigger>
              <SelectContent>
                {shops.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground">
                    আগে অন্তত একবার ফর্দ পাঠান
                  </div>
                ) : (
                  shops.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>পুনরাবৃত্তি</Label>
            <RadioGroup
              value={recurrence}
              onValueChange={(v) => setRecurrence(v as Recurrence)}
              className="flex flex-col gap-2"
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="monthly" /> প্রতি মাসে
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="weekly" /> প্রতি সপ্তাহে
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="once" /> একবার (নির্দিষ্ট তারিখে)
              </label>
            </RadioGroup>
          </div>

          {recurrence === "monthly" && (
            <div className="space-y-1">
              <Label>মাসের কত তারিখে?</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
              />
              <p className="text-xs text-muted-foreground">
                সকাল ৯টায় স্বয়ংক্রিয়ভাবে দোকানে পাঠানো হবে।
              </p>
            </div>
          )}

          {recurrence === "weekly" && (
            <div className="space-y-1">
              <Label>সপ্তাহের কোন দিন?</Label>
              <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((d) => (
                    <SelectItem key={d.v} value={String(d.v)}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {recurrence === "once" && (
            <div className="space-y-1">
              <Label>তারিখ ও সময়</Label>
              <Input
                type="datetime-local"
                value={onceDate}
                onChange={(e) => setOnceDate(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>বাতিল</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "সংরক্ষণ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}