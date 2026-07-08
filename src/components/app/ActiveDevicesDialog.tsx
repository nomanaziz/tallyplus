import { getNumLocale } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Smartphone, LogOut, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getDeviceId } from "@/lib/device-id";

type Sess = { id: string; device_id: string; user_agent: string | null; last_seen_at: string; created_at: string };

function describeDevice(ua: string | null): string {
  if (!ua) return "Unknown device";
  const s = ua.toLowerCase();
  let os = "Unknown";
  if (s.includes("android")) os = "Android";
  else if (s.includes("iphone") || s.includes("ipad") || s.includes("ios")) os = "iOS";
  else if (s.includes("windows")) os = "Windows";
  else if (s.includes("mac os") || s.includes("macintosh")) os = "macOS";
  else if (s.includes("linux")) os = "Linux";
  let browser = "";
  if (s.includes("edg/")) browser = "Edge";
  else if (s.includes("chrome/") && !s.includes("edg/")) browser = "Chrome";
  else if (s.includes("firefox/")) browser = "Firefox";
  else if (s.includes("safari/") && !s.includes("chrome/")) browser = "Safari";
  return browser ? `${os} • ${browser}` : os;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "এইমাত্র";
  if (m < 60) return `${m} মিনিট আগে`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ঘন্টা আগে`;
  const d = Math.floor(h / 24);
  return `${d} দিন আগে`;
}

export function ActiveDevicesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [items, setItems] = useState<Sess[]>([]);
  const [loading, setLoading] = useState(false);
  const myId = getDeviceId();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_active_sessions")
      .select("id,device_id,user_agent,last_seen_at,created_at")
      .order("last_seen_at", { ascending: false });
    setItems((data as Sess[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (open) void load(); }, [open]);

  const revoke = async (s: Sess) => {
    if (s.device_id === myId) {
      toast.message("এটা আপনার বর্তমান device। লগআউট করতে Settings → লগআউট ব্যবহার করুন।");
      return;
    }
    const { error } = await supabase.from("user_active_sessions").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("ঐ device লগআউট করা হয়েছে");
    void load();
  };

  const revokeOthers = async () => {
    const { error } = await supabase.from("user_active_sessions").delete().neq("device_id", myId);
    if (error) return toast.error(error.message);
    toast.success("অন্য সকল device লগআউট হয়েছে");
    void load();
  };

  const others = items.filter((s) => s.device_id !== myId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>সক্রিয় device সমূহ</DialogTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void load()} aria-label="refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          সর্বোচ্চ ২টি device একসাথে লগইন থাকতে পারবে। নতুন device login করলে সবচেয়ে পুরনোটা স্বয়ংক্রিয়ভাবে লগআউট হয়ে যাবে। নিচ থেকে যেকোনো device আপনি নিজেও লগআউট করতে পারবেন।
        </p>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : items.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">কোনো active device নেই</div>
          ) : items.map((s) => {
            const isMe = s.device_id === myId;
            return (
              <div
                key={s.id}
                className={`flex items-start gap-2.5 rounded-lg border p-2.5 ${isMe ? "border-primary/40 bg-primary/5" : "bg-card"}`}
              >
                <div className={`mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full ${isMe ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <Smartphone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="truncate text-sm font-semibold">{describeDevice(s.user_agent)}</div>
                    {isMe && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                        <CheckCircle2 className="h-2.5 w-2.5" /> এই device
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    সর্বশেষ সক্রিয়: {timeAgo(s.last_seen_at)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    লগইন: {new Date(s.created_at).toLocaleDateString(getNumLocale())} {new Date(s.created_at).toLocaleTimeString(getNumLocale(), { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                {!isMe && (
                  <Button variant="outline" size="sm" className="h-8 text-destructive hover:text-destructive" onClick={() => revoke(s)}>
                    <LogOut className="mr-1 h-3.5 w-3.5" /> লগআউট
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button variant="outline" size="sm" onClick={revokeOthers} disabled={others.length === 0}>
            <LogOut className="mr-1.5 h-3.5 w-3.5" /> অন্য সব device লগআউট
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>ঠিক আছে</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
