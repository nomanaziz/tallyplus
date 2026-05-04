import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

import { useEffect } from "react";

type AppLink = {
  key: string;
  label_bn: string;
  label_en: string;
  url: string;
  link_type: "internal" | "external";
  icon: string;
  section: string;
  sort_order: number;
  is_active: boolean;
};

const ICON_OPTIONS = [
  "Users",
  "Facebook",
  "HelpCircle",
  "MessageCircle",
  "Globe",
  "Youtube",
  "BookOpen",
  "Mail",
  "Link",
];

type FormState = Omit<AppLink, "section"> & { section: string; isNew: boolean };

const emptyForm = (): FormState => ({
  key: "",
  label_bn: "",
  label_en: "",
  url: "",
  link_type: "external",
  icon: "Link",
  section: "other",
  sort_order: 0,
  is_active: true,
  isNew: true,
});

function SettingsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<FormState | null>(null);

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["admin_app_links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_links")
        .select("*")
        .order("section", { ascending: true })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AppLink[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin_app_links"] });
    qc.invalidateQueries({ queryKey: ["app_links", "other"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (form: FormState) => {
      const payload = {
        key: form.key.trim(),
        label_bn: form.label_bn,
        label_en: form.label_en,
        url: form.url,
        link_type: form.link_type,
        icon: form.icon,
        section: form.section,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      };
      if (form.isNew) {
        const { error } = await supabase.from("app_links").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("app_links")
          .update(payload)
          .eq("key", payload.key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase.from("app_links").delete().eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ key, val }: { key: string; val: boolean }) => {
      const { error } = await supabase
        .from("app_links")
        .update({ is_active: val })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => refresh(),
    onError: (err: Error) => toast.error(err.message),
  });

  const moveSort = useMutation({
    mutationFn: async ({ key, delta }: { key: string; delta: number }) => {
      const link = links.find((l) => l.key === key);
      if (!link) return;
      const { error } = await supabase
        .from("app_links")
        .update({ sort_order: link.sort_order + delta })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => refresh(),
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">App Settings</h1>
        <p className="text-sm text-muted-foreground">
          Settings menu-র "অন্যান্য" section-এর link গুলো এখান থেকে manage করুন।
        </p>
      </div>

      <SiteContactCard />

      <TrialSettingsCard />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">App Links</CardTitle>
          <Button size="sm" onClick={() => setEditing(emptyForm())}>
            <Plus className="mr-1 h-4 w-4" /> নতুন link
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sort</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Label (BN / EN)</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && links.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    কোনো link নেই
                  </TableCell>
                </TableRow>
              )}
              {links.map((l) => (
                <TableRow key={l.key}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="w-6 text-xs text-muted-foreground">{l.sort_order}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => moveSort.mutate({ key: l.key, delta: -10 })}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => moveSort.mutate({ key: l.key, delta: 10 })}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{l.key}</TableCell>
                  <TableCell>
                    <div className="text-sm">{l.label_bn}</div>
                    <div className="text-xs text-muted-foreground">{l.label_en}</div>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs">{l.url}</TableCell>
                  <TableCell className="text-xs">{l.link_type}</TableCell>
                  <TableCell className="text-xs">{l.icon}</TableCell>
                  <TableCell>
                    <Switch
                      checked={l.is_active}
                      onCheckedChange={(v) => toggleActive.mutate({ key: l.key, val: v })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditing({ ...l, isNew: false })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete "${l.key}"?`)) deleteMutation.mutate(l.key);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.isNew ? "নতুন Link" : "Edit Link"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Key (unique identifier)</Label>
                <Input
                  value={editing.key}
                  disabled={!editing.isNew}
                  onChange={(e) => setEditing({ ...editing, key: e.target.value })}
                  placeholder="e.g. youtube_channel"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Label (BN)</Label>
                  <Input
                    value={editing.label_bn}
                    onChange={(e) => setEditing({ ...editing, label_bn: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Label (EN)</Label>
                  <Input
                    value={editing.label_en}
                    onChange={(e) => setEditing({ ...editing, label_en: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>URL or route</Label>
                <Input
                  value={editing.url}
                  onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                  placeholder="https://… or /app/affiliate"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label>Type</Label>
                  <Select
                    value={editing.link_type}
                    onValueChange={(v) =>
                      setEditing({ ...editing, link_type: v as "internal" | "external" })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="external">External</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Icon</Label>
                  <Select
                    value={editing.icon}
                    onValueChange={(v) => setEditing({ ...editing, icon: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Sort</Label>
                  <Input
                    type="number"
                    value={editing.sort_order}
                    onChange={(e) =>
                      setEditing({ ...editing, sort_order: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
                <Label>Active</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              onClick={() => editing && saveMutation.mutate(editing)}
              disabled={saveMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SettingsPage;

type ContactForm = {
  facebook_url: string;
  youtube_url: string;
  whatsapp_number: string;
  password_reset_whatsapp: string;
  support_phone: string;
  support_email: string;
};

const emptyContact: ContactForm = {
  facebook_url: "",
  youtube_url: "",
  whatsapp_number: "",
  password_reset_whatsapp: "",
  support_phone: "",
  support_email: "",
};

function SiteContactCard() {
  const qc = useQueryClient();
  const [form, setForm] = useState<ContactForm>(emptyContact);

  const { data, isLoading } = useQuery({
    queryKey: ["admin_site_contact"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_settings")
        .select(
          "facebook_url, youtube_url, whatsapp_number, password_reset_whatsapp, support_phone, support_email"
        )
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        facebook_url: data.facebook_url ?? "",
        youtube_url: data.youtube_url ?? "",
        whatsapp_number: data.whatsapp_number ?? "",
        password_reset_whatsapp: data.password_reset_whatsapp ?? "",
        support_phone: data.support_phone ?? "",
        support_email: data.support_email ?? "",
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        id: true,
        facebook_url: form.facebook_url.trim() || null,
        youtube_url: form.youtube_url.trim() || null,
        whatsapp_number: form.whatsapp_number.trim() || null,
        password_reset_whatsapp: form.password_reset_whatsapp.trim() || null,
        support_phone: form.support_phone.trim() || null,
        support_email: form.support_email.trim() || null,
      };
      const { error } = await supabase
        .from("affiliate_settings")
        .upsert(payload, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin_site_contact"] });
      qc.invalidateQueries({ queryKey: ["site_contact"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Site Contact & Social Links</CardTitle>
        <p className="text-xs text-muted-foreground">
          এই value গুলো main website-এর footer, contact section, এবং login page-এর "PIN ভুলে গেছেন" link-এ ব্যবহার হবে।
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Facebook page URL</Label>
            <Input
              value={form.facebook_url}
              onChange={(e) => setForm({ ...form, facebook_url: e.target.value })}
              placeholder="https://facebook.com/yourpage"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>YouTube channel URL</Label>
            <Input
              value={form.youtube_url}
              onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
              placeholder="https://youtube.com/@yourchannel"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>WhatsApp contact number</Label>
            <Input
              value={form.whatsapp_number}
              onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
              placeholder="+8801XXXXXXXXX"
            />
            <p className="text-[11px] text-muted-foreground">Footer / Contact section-এ দেখাবে।</p>
          </div>
          <div className="grid gap-1.5">
            <Label>Password reset WhatsApp</Label>
            <Input
              value={form.password_reset_whatsapp}
              onChange={(e) =>
                setForm({ ...form, password_reset_whatsapp: e.target.value })
              }
              placeholder="+8801XXXXXXXXX"
            />
            <p className="text-[11px] text-muted-foreground">
              Login page-এ "PIN ভুলে গেছেন? WhatsApp করুন"-এ যাবে। ফাঁকা থাকলে support phone use হবে।
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label>Support phone</Label>
            <Input
              value={form.support_phone}
              onChange={(e) => setForm({ ...form, support_phone: e.target.value })}
              placeholder="+8801XXXXXXXXX"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Support email</Label>
            <Input
              type="email"
              value={form.support_email}
              onChange={(e) => setForm({ ...form, support_email: e.target.value })}
              placeholder="support@example.com"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={isLoading || saveMutation.isPending}
          >
            Save Contact Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
