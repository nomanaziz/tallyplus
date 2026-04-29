import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Star, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

type Gateway = {
  id: string;
  provider: "reve" | "whatsapp" | "telegram" | "other";
  display_name: string;
  is_active: boolean;
  is_primary: boolean;
  sort_order: number;
  config: Record<string, any>;
};

type Pkg = { id: string; name_bn: string; name_en: string; sms_count: number; price_bdt: number; is_active: boolean; sort_order: number };
type Template = { id: string; code: string; name_bn: string; name_en: string; body_template: string; is_active: boolean; sort_order: number };

const PROVIDERS = [
  { value: "reve", label: "REVE SMS", masking: true },
  { value: "whatsapp", label: "WhatsApp", masking: false },
  { value: "telegram", label: "Telegram", masking: false },
  { value: "other", label: "Other", masking: false },
];

function blankGateway(): Omit<Gateway, "id"> {
  return {
    provider: "reve",
    display_name: "REVE SMS",
    is_active: true,
    is_primary: false,
    sort_order: 0,
    config: { base_url: "http://smpp.revesms.com:7788", api_key: "", secret_key: "", sender_id: "", masking: "non-masking", username: "", password: "" },
  };
}

export default function AdminSmsGateways() {
  const [tab, setTab] = useState("gateways");
  const [loading, setLoading] = useState(true);

  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [editingGw, setEditingGw] = useState<(Omit<Gateway, "id"> & { id?: string }) | null>(null);

  const [packages, setPackages] = useState<Pkg[]>([]);
  const [editingPkg, setEditingPkg] = useState<(Omit<Pkg, "id"> & { id?: string }) | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingTpl, setEditingTpl] = useState<(Omit<Template, "id"> & { id?: string }) | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: g }, { data: p }, { data: t }] = await Promise.all([
      supabase.from("sms_gateways").select("*").order("sort_order").order("created_at"),
      supabase.from("sms_packages").select("*").order("sort_order").order("sms_count"),
      supabase.from("sms_templates").select("*").order("sort_order").order("code"),
    ]);
    setGateways((g as Gateway[]) ?? []);
    setPackages((p as Pkg[]) ?? []);
    setTemplates((t as Template[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  // Gateway save
  const saveGw = async () => {
    if (!editingGw) return;
    const payload = { ...editingGw };
    let err;
    if (editingGw.id) {
      const { id, ...rest } = payload;
      ({ error: err } = await supabase.from("sms_gateways").update(rest).eq("id", id));
    } else {
      ({ error: err } = await supabase.from("sms_gateways").insert(payload));
    }
    if (err) { toast.error(err.message); return; }
    toast.success("Saved");
    setEditingGw(null);
    loadAll();
  };
  const delGw = async (id: string) => {
    if (!confirm("Delete this gateway?")) return;
    const { error } = await supabase.from("sms_gateways").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted"); loadAll();
  };
  const setPrimary = async (id: string) => {
    const { error } = await supabase.from("sms_gateways").update({ is_primary: true }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Set as primary"); loadAll();
  };

  // Package save
  const savePkg = async () => {
    if (!editingPkg) return;
    let err;
    if (editingPkg.id) {
      const { id, ...rest } = editingPkg;
      ({ error: err } = await supabase.from("sms_packages").update(rest).eq("id", id));
    } else {
      ({ error: err } = await supabase.from("sms_packages").insert(editingPkg));
    }
    if (err) { toast.error(err.message); return; }
    toast.success("Saved"); setEditingPkg(null); loadAll();
  };
  const delPkg = async (id: string) => {
    if (!confirm("Delete this package?")) return;
    const { error } = await supabase.from("sms_packages").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    loadAll();
  };

  // Template save
  const saveTpl = async () => {
    if (!editingTpl) return;
    let err;
    if (editingTpl.id) {
      const { id, ...rest } = editingTpl;
      ({ error: err } = await supabase.from("sms_templates").update(rest).eq("id", id));
    } else {
      ({ error: err } = await supabase.from("sms_templates").insert(editingTpl));
    }
    if (err) { toast.error(err.message); return; }
    toast.success("Saved"); setEditingTpl(null); loadAll();
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="container max-w-6xl px-3 py-4 sm:px-4">
      <h1 className="mb-4 text-2xl font-bold">SMS Gateways & Packages</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="gateways">Gateways</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Gateways */}
        <TabsContent value="gateways" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setEditingGw(blankGateway())} className="gap-1"><Plus className="h-4 w-4" /> Add Gateway</Button>
          </div>
          <div className="rounded-xl border bg-background">
            {gateways.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No gateways. Add one to start sending SMS.</div>
            ) : gateways.map((g) => (
              <div key={g.id} className="flex flex-wrap items-center gap-3 border-b p-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{g.display_name}</span>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase">{g.provider}</span>
                    {g.is_primary && <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"><Star className="h-3 w-3" />Primary</span>}
                    {!g.is_active && <span className="rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-700">Disabled</span>}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    Sender: {g.config?.sender_id || "—"} • {g.config?.masking || "non-masking"} • {g.config?.base_url || ""}
                  </div>
                </div>
                {!g.is_primary && g.is_active && (
                  <Button size="sm" variant="outline" onClick={() => setPrimary(g.id)} className="gap-1"><Star className="h-3 w-3" />Set Primary</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setEditingGw(g)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => delGw(g.id)} className="text-rose-600"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Packages */}
        <TabsContent value="packages" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setEditingPkg({ name_bn: "", name_en: "", sms_count: 100, price_bdt: 100, is_active: true, sort_order: 0 })} className="gap-1"><Plus className="h-4 w-4" /> Add Package</Button>
          </div>
          <div className="rounded-xl border bg-background">
            {packages.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No packages yet.</div>
            ) : packages.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 border-b p-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{p.name_bn} <span className="text-xs text-muted-foreground">({p.name_en})</span></div>
                  <div className="text-sm text-muted-foreground">{p.sms_count} SMS • ৳{p.price_bdt} {!p.is_active && <span className="ml-1 rounded bg-rose-100 px-1.5 text-xs text-rose-700">Disabled</span>}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditingPkg(p)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => delPkg(p.id)} className="text-rose-600"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="mt-4 space-y-3">
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            Placeholders: <code>{"{name}"}</code>, <code>{"{amount}"}</code>, <code>{"{due}"}</code>. Shop signature is appended automatically.
          </div>
          <div className="rounded-xl border bg-background">
            {templates.map((t) => (
              <div key={t.id} className="flex flex-wrap items-start gap-3 border-b p-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{t.name_bn} <span className="text-xs text-muted-foreground">({t.code})</span></div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{t.body_template}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditingTpl(t)}><Pencil className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Gateway dialog */}
      <Dialog open={!!editingGw} onOpenChange={(o) => !o && setEditingGw(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingGw?.id ? "Edit" : "Add"} SMS Gateway</DialogTitle></DialogHeader>
          {editingGw && (
            <div className="space-y-3">
              <div>
                <Label>Provider</Label>
                <Select value={editingGw.provider} onValueChange={(v) => setEditingGw({ ...editingGw, provider: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Display Name</Label>
                <Input value={editingGw.display_name} onChange={(e) => setEditingGw({ ...editingGw, display_name: e.target.value })} />
              </div>
              {editingGw.provider === "reve" && (
                <>
                  <div><Label>Base URL</Label><Input value={editingGw.config.base_url || ""} onChange={(e) => setEditingGw({ ...editingGw, config: { ...editingGw.config, base_url: e.target.value } })} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>API Key</Label><Input value={editingGw.config.api_key || ""} onChange={(e) => setEditingGw({ ...editingGw, config: { ...editingGw.config, api_key: e.target.value } })} /></div>
                    <div><Label>Secret Key</Label><Input value={editingGw.config.secret_key || ""} onChange={(e) => setEditingGw({ ...editingGw, config: { ...editingGw.config, secret_key: e.target.value } })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Username (optional)</Label><Input value={editingGw.config.username || ""} onChange={(e) => setEditingGw({ ...editingGw, config: { ...editingGw.config, username: e.target.value } })} /></div>
                    <div><Label>Password (optional)</Label><Input type="password" value={editingGw.config.password || ""} onChange={(e) => setEditingGw({ ...editingGw, config: { ...editingGw.config, password: e.target.value } })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Sender ID (callerID)</Label><Input value={editingGw.config.sender_id || ""} onChange={(e) => setEditingGw({ ...editingGw, config: { ...editingGw.config, sender_id: e.target.value } })} placeholder="8809612xxxxx" /></div>
                    <div>
                      <Label>Type</Label>
                      <Select value={editingGw.config.masking || "non-masking"} onValueChange={(v) => setEditingGw({ ...editingGw, config: { ...editingGw.config, masking: v } })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="masking">Masking</SelectItem>
                          <SelectItem value="non-masking">Non-masking</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
              {editingGw.provider !== "reve" && (
                <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                  {editingGw.provider === "whatsapp" ? "WhatsApp" : editingGw.provider === "telegram" ? "Telegram" : "Other"} provider — coming soon. You can save credentials but sending is not yet implemented.
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><Switch checked={editingGw.is_active} onCheckedChange={(v) => setEditingGw({ ...editingGw, is_active: v })} /><Label>Active</Label></div>
                <div className="flex items-center gap-2"><Switch checked={editingGw.is_primary} onCheckedChange={(v) => setEditingGw({ ...editingGw, is_primary: v })} /><Label>Set as Primary</Label></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGw(null)}>Cancel</Button>
            <Button onClick={saveGw} className="gap-1"><Save className="h-4 w-4" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package dialog */}
      <Dialog open={!!editingPkg} onOpenChange={(o) => !o && setEditingPkg(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingPkg?.id ? "Edit" : "Add"} Package</DialogTitle></DialogHeader>
          {editingPkg && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Name (Bangla)</Label><Input value={editingPkg.name_bn} onChange={(e) => setEditingPkg({ ...editingPkg, name_bn: e.target.value })} /></div>
                <div><Label>Name (English)</Label><Input value={editingPkg.name_en} onChange={(e) => setEditingPkg({ ...editingPkg, name_en: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>SMS Count</Label><Input type="number" min={1} value={editingPkg.sms_count} onChange={(e) => setEditingPkg({ ...editingPkg, sms_count: Number(e.target.value) })} /></div>
                <div><Label>Price (৳)</Label><Input type="number" min={0} step="0.01" value={editingPkg.price_bdt} onChange={(e) => setEditingPkg({ ...editingPkg, price_bdt: Number(e.target.value) })} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={editingPkg.is_active} onCheckedChange={(v) => setEditingPkg({ ...editingPkg, is_active: v })} /><Label>Active</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPkg(null)}>Cancel</Button>
            <Button onClick={savePkg}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template dialog */}
      <Dialog open={!!editingTpl} onOpenChange={(o) => !o && setEditingTpl(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
          {editingTpl && (
            <div className="space-y-3">
              <div><Label>Code</Label><Input value={editingTpl.code} disabled /></div>
              <div><Label>Name (Bangla)</Label><Input value={editingTpl.name_bn} onChange={(e) => setEditingTpl({ ...editingTpl, name_bn: e.target.value })} /></div>
              <div><Label>Body</Label><Textarea rows={4} value={editingTpl.body_template} onChange={(e) => setEditingTpl({ ...editingTpl, body_template: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editingTpl.is_active} onCheckedChange={(v) => setEditingTpl({ ...editingTpl, is_active: v })} /><Label>Active</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTpl(null)}>Cancel</Button>
            <Button onClick={saveTpl}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}