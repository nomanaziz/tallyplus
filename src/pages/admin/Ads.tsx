import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Pencil, Upload } from "lucide-react";
import { invalidateAdConfigCache } from "@/components/ads/AdSlot";

// Permissive cast: new tables; generated types regenerate after migration.
const sb = supabase as unknown as {
  from: (t: string) => {
    select: (q: string) => {
      eq: (c: string, v: unknown) => {
        maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
      };
      order: (c: string) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    update: (
      v: unknown,
    ) => { eq: (c: string, v: unknown) => Promise<{ error: { message: string } | null }> };
  };
  storage: typeof supabase.storage;
};

type Settings = {
  enabled: boolean;
  adsense_publisher_id: string | null;
  show_to_free_owners: boolean;
  show_to_consumers: boolean;
  show_to_subscribers: boolean;
};

type Slot = {
  id: string;
  slot_key: string;
  label: string;
  mode: "adsense" | "custom" | "disabled";
  adsense_slot_id: string | null;
  adsense_format: string;
  custom_image_url: string | null;
  custom_link_url: string | null;
  custom_title: string | null;
  is_active: boolean;
  sort_order: number;
};

function AdsAdmin() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editing, setEditing] = useState<Slot | null>(null);
  const [savingSlot, setSavingSlot] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [s, sl] = await Promise.all([
      sb.from("ad_settings").select("*").eq("id", true).maybeSingle(),
      sb.from("ad_slots").select("*").order("sort_order"),
    ]);
    setSettings((s.data as Settings | null) ?? {
      enabled: false,
      adsense_publisher_id: null,
      show_to_free_owners: true,
      show_to_consumers: true,
      show_to_subscribers: false,
    });
    setSlots(((sl.data as Slot[] | null) ?? []).sort((a, b) => a.sort_order - b.sort_order));
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    const { error } = await sb.from("ad_settings").update({
      enabled: settings.enabled,
      adsense_publisher_id: settings.adsense_publisher_id?.trim() || null,
      show_to_free_owners: settings.show_to_free_owners,
      show_to_consumers: settings.show_to_consumers,
      show_to_subscribers: settings.show_to_subscribers,
    }).eq("id", true);
    setSavingSettings(false);
    if (error) { toast.error(error.message); return; }
    invalidateAdConfigCache();
    toast.success("Settings saved");
  };

  const saveSlot = async () => {
    if (!editing) return;
    setSavingSlot(true);
    const { error } = await sb.from("ad_slots").update({
      mode: editing.mode,
      adsense_slot_id: editing.adsense_slot_id?.trim() || null,
      adsense_format: editing.adsense_format || "auto",
      custom_image_url: editing.custom_image_url?.trim() || null,
      custom_link_url: editing.custom_link_url?.trim() || null,
      custom_title: editing.custom_title?.trim() || null,
      is_active: editing.is_active,
    }).eq("id", editing.id);
    setSavingSlot(false);
    if (error) { toast.error(error.message); return; }
    invalidateAdConfigCache();
    setEditing(null);
    toast.success("Slot updated");
    void load();
  };

  const uploadCustom = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const name = `ads/${editing.slot_key}-${crypto.randomUUID()}.${ext}`;
    // Reuse existing public bucket so we don't need a new migration.
    const { error } = await sb.storage.from("dashboard-banners").upload(name, file, {
      cacheControl: "3600", upsert: false,
    });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = sb.storage.from("dashboard-banners").getPublicUrl(name);
    setEditing({ ...editing, custom_image_url: data.publicUrl });
    setUploading(false);
  };

  if (loading || !settings) {
    return <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="container max-w-5xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold">Ads / Monetization</h1>
        <p className="text-sm text-muted-foreground">
          Google AdSense বা নিজস্ব custom ad কনফিগার করুন। Free user-দের কাছে বিজ্ঞাপন দেখাবে; paid subscriber-রা সাধারণত দেখবে না।
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Global Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={settings.enabled}
              onCheckedChange={(v) => setSettings({ ...settings, enabled: v })}
            />
            <Label>Ad system enabled</Label>
          </div>
          <div>
            <Label>Google AdSense Publisher ID</Label>
            <Input
              placeholder="ca-pub-XXXXXXXXXXXXXXXX"
              value={settings.adsense_publisher_id ?? ""}
              onChange={(e) => setSettings({ ...settings, adsense_publisher_id: e.target.value })}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              AdSense dashboard → Account → Settings → Account information.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-center gap-2 rounded border p-3">
              <Switch checked={settings.show_to_free_owners}
                onCheckedChange={(v) => setSettings({ ...settings, show_to_free_owners: v })} />
              <span className="text-sm">Show to free shop owners</span>
            </label>
            <label className="flex items-center gap-2 rounded border p-3">
              <Switch checked={settings.show_to_consumers}
                onCheckedChange={(v) => setSettings({ ...settings, show_to_consumers: v })} />
              <span className="text-sm">Show to consumers (গ্রাহক)</span>
            </label>
            <label className="flex items-center gap-2 rounded border p-3">
              <Switch checked={settings.show_to_subscribers}
                onCheckedChange={(v) => setSettings({ ...settings, show_to_subscribers: v })} />
              <span className="text-sm">Show to paid subscribers</span>
            </label>
          </div>
          <Button onClick={() => void saveSettings()} disabled={savingSettings}>
            {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Ad Slots</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {slots.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded border p-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{s.label}</div>
                <div className="truncate text-xs text-muted-foreground">
                  Key: <code>{s.slot_key}</code> · Mode: <b>{s.mode}</b>
                  {s.mode === "adsense" && s.adsense_slot_id ? ` · Slot ${s.adsense_slot_id}` : ""}
                  {s.mode === "custom" && s.custom_image_url ? " · custom image set" : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={s.is_active}
                  onCheckedChange={async (v) => {
                    const { error } = await sb.from("ad_slots").update({ is_active: v }).eq("id", s.id);
                    if (error) toast.error(error.message);
                    else { invalidateAdConfigCache(); void load(); }
                  }}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing({ ...s })}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.label}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Mode</Label>
                <Select
                  value={editing.mode}
                  onValueChange={(v) => setEditing({ ...editing, mode: v as Slot["mode"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">Disabled (no ad)</SelectItem>
                    <SelectItem value="adsense">Google AdSense</SelectItem>
                    <SelectItem value="custom">Custom / House ad</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editing.mode === "adsense" && (
                <>
                  <div>
                    <Label>AdSense Slot ID</Label>
                    <Input
                      placeholder="1234567890"
                      value={editing.adsense_slot_id ?? ""}
                      onChange={(e) => setEditing({ ...editing, adsense_slot_id: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Format</Label>
                    <Select
                      value={editing.adsense_format || "auto"}
                      onValueChange={(v) => setEditing({ ...editing, adsense_format: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (responsive)</SelectItem>
                        <SelectItem value="rectangle">Rectangle</SelectItem>
                        <SelectItem value="horizontal">Horizontal</SelectItem>
                        <SelectItem value="vertical">Vertical</SelectItem>
                        <SelectItem value="fluid">Fluid (in-feed)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {editing.mode === "custom" && (
                <>
                  <div>
                    <Label>Image</Label>
                    {editing.custom_image_url && (
                      <img src={editing.custom_image_url} alt="" className="mt-1 h-28 w-full rounded border object-cover" />
                    )}
                    <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span>{editing.custom_image_url ? "Replace image" : "Upload image"}</span>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCustom(f); }} />
                    </label>
                  </div>
                  <div>
                    <Label>Link URL</Label>
                    <Input value={editing.custom_link_url ?? ""}
                      onChange={(e) => setEditing({ ...editing, custom_link_url: e.target.value })} />
                  </div>
                  <div>
                    <Label>Title / Alt text</Label>
                    <Input value={editing.custom_title ?? ""}
                      onChange={(e) => setEditing({ ...editing, custom_title: e.target.value })} />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Switch checked={editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => void saveSlot()} disabled={savingSlot || uploading}>
              {savingSlot ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdsAdmin;