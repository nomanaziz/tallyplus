import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";



type Plan = {
  id: string;
  code: string;
  name_bn: string;
  name_en: string;
  price_bdt: number;
  duration_days: number;
  is_active: boolean;
  max_shops: number;
};

function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Plan> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("subscription_plans").select("*").order("price_bdt");
    setPlans((data as Plan[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.code || !editing.name_bn || !editing.name_en) {
      return toast.error("সব field পূরণ করুন");
    }
    setSaving(true);
    const payload = {
      code: editing.code,
      name_bn: editing.name_bn,
      name_en: editing.name_en,
      price_bdt: Number(editing.price_bdt) || 0,
      duration_days: Number(editing.duration_days) || 30,
      is_active: editing.is_active ?? true,
      max_shops: Math.max(1, Number(editing.max_shops) || 1),
    };
    const { error } = editing.id
      ? await supabase.from("subscription_plans").update(payload).eq("id", editing.id)
      : await supabase.from("subscription_plans").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    void load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscription Plans</h1>
          <p className="text-sm text-muted-foreground">Plan add/edit করুন</p>
        </div>
        <Button onClick={() => setEditing({ is_active: true, duration_days: 30, max_shops: 1 })}>
          <Plus className="mr-1 h-4 w-4" /> New Plan
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{p.name_bn}</div>
                    <div className="text-xs text-muted-foreground">{p.name_en} • {p.code}</div>
                  </div>
                  <Badge variant={p.is_active ? "default" : "secondary"}>
                    {p.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="mt-3 text-2xl font-bold">৳ {p.price_bdt}</div>
                <div className="text-xs text-muted-foreground">
                  {p.duration_days} days • Max {p.max_shops} shop{p.max_shops === 1 ? "" : "s"}
                </div>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setEditing(p)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
              </CardContent>
            </Card>
          ))}
          {plans.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
              কোন plan নেই। নতুন plan তৈরি করুন।
            </p>
          )}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Plan" : "New Plan"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Code</Label>
              <Input value={editing?.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="basic, pro, etc" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name (Bangla)</Label>
                <Input value={editing?.name_bn ?? ""} onChange={(e) => setEditing({ ...editing, name_bn: e.target.value })} />
              </div>
              <div>
                <Label>Name (English)</Label>
                <Input value={editing?.name_en ?? ""} onChange={(e) => setEditing({ ...editing, name_en: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price (BDT)</Label>
                <Input type="number" value={editing?.price_bdt ?? 0} onChange={(e) => setEditing({ ...editing, price_bdt: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Duration (days)</Label>
                <Input type="number" value={editing?.duration_days ?? 30} onChange={(e) => setEditing({ ...editing, duration_days: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Max Shops Allowed</Label>
              <Input
                type="number"
                min={1}
                value={editing?.max_shops ?? 1}
                onChange={(e) => setEditing({ ...editing, max_shops: Number(e.target.value) })}
                placeholder="e.g. 1, 3, 5, 10"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                এই plan-এ একজন user সর্বোচ্চ কতগুলো দোকান add করতে পারবে।
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PlansPage;
