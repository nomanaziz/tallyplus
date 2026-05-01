import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getDeviceId } from "@/lib/device-id";

type Sess = { id: string; device_id: string; user_agent: string | null; last_seen_at: string; created_at: string };

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
      toast.message("এটা তোমার বর্তমান device। সাইন আউট করতে চাইলে settings থেকে Sign out করো।");
      return;
    }
    const { error } = await supabase.from("user_active_sessions").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Device removed");
    void load();
  };

  const revokeOthers = async () => {
    const { error } = await supabase.from("user_active_sessions").delete().neq("device_id", myId);
    if (error) return toast.error(error.message);
    toast.success("অন্য সকল device sign out হবে");
    void load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>সক্রিয় device সমূহ</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          সর্বোচ্চ ২টি device একসাথে লগইন থাকতে পারবে। নতুন device যুক্ত করলে সবচেয়ে পুরোনোটা স্বয়ংক্রিয়ভাবে sign out হবে।
        </p>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : items.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No devices</div>
          ) : items.map((s) => (
            <div key={s.id} className="flex items-start gap-2 rounded border p-2">
              <Smartphone className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {s.device_id === myId ? "এই device (current)" : s.user_agent?.split(")")[0]?.split("(")[1] ?? "Unknown"}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">{s.user_agent ?? s.device_id}</div>
                <div className="text-[11px] text-muted-foreground">Last seen: {new Date(s.last_seen_at).toLocaleString()}</div>
              </div>
              {s.device_id !== myId && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => revoke(s)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="outline" size="sm" onClick={revokeOthers} disabled={items.filter((s) => s.device_id !== myId).length === 0}>
            Sign out others
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
