import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Gift } from "lucide-react";
import { toast } from "sonner";

type Plan = { id: string; name_bn: string; name_en: string; code: string; duration_days: number; max_shops: number };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: { id: string; full_name: string | null; phone: string | null } | null;
  onDone?: () => void;
};

export function GrantAccessDialog({ open, onOpenChange, user, onDone }: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState<string>("");
  const [durationMode, setDurationMode] = useState<"plan" | "custom" | "lifetime">("plan");
  const [customDays, setCustomDays] = useState<number>(90);
  const [shopMode, setShopMode] = useState<"plan" | "custom" | "unlimited">("plan");
  const [customShops, setCustomShops] = useState<number>(5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("id,name_bn,name_en,code,duration_days,max_shops")
        .order("price_bdt", { ascending: true });
      const list = (data ?? []) as Plan[];
      setPlans(list);
      const lifetime = list.find((p) => p.code === "lifetime");
      const def = lifetime ?? list[list.length - 1] ?? list[0];
      if (def) setPlanId(def.id);
    })();
  }, [open]);

  const selectedPlan = plans.find((p) => p.id === planId);

  const submit = async () => {
    if (!user || !planId) return;
    setSaving(true);
    const days = durationMode === "lifetime" ? 3650 : durationMode === "custom" ? Math.max(1, customDays) : (selectedPlan?.duration_days ?? 30);
    const unlimited = shopMode === "unlimited";
    const shopLimit = shopMode === "custom" ? Math.max(1, customShops) : null;
    const { error } = await supabase.rpc("admin_grant_access", {
      _user_id: user.id,
      _plan_id: planId,
      _duration_days: days,
      _shop_limit: shopLimit,
      _unlimited_shops: unlimited,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Access granted");
    onOpenChange(false);
    onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            Grant Access — {user?.full_name || user?.phone || "User"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1 block text-xs">Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name_bn} {p.code === "lifetime" ? "★" : ""} — {p.duration_days}d / {p.max_shops} shop{p.max_shops === 1 ? "" : "s"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1 block text-xs">Duration</Label>
            <RadioGroup value={durationMode} onValueChange={(v) => setDurationMode(v as never)} className="space-y-1">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="plan" id="d-plan" />
                <Label htmlFor="d-plan" className="cursor-pointer text-sm font-normal">
                  Use plan default ({selectedPlan?.duration_days ?? 30} days)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="custom" id="d-custom" />
                <Label htmlFor="d-custom" className="cursor-pointer text-sm font-normal">Custom:</Label>
                <Input
                  type="number" min={1} className="h-8 w-24"
                  value={customDays}
                  onChange={(e) => setCustomDays(Number(e.target.value) || 1)}
                  onFocus={() => setDurationMode("custom")}
                />
                <span className="text-xs text-muted-foreground">days</span>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="lifetime" id="d-life" />
                <Label htmlFor="d-life" className="cursor-pointer text-sm font-normal">Lifetime (10 years)</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="mb-1 block text-xs">Shops allowed</Label>
            <RadioGroup value={shopMode} onValueChange={(v) => setShopMode(v as never)} className="space-y-1">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="plan" id="s-plan" />
                <Label htmlFor="s-plan" className="cursor-pointer text-sm font-normal">
                  Use plan limit ({selectedPlan?.max_shops ?? 1})
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="custom" id="s-custom" />
                <Label htmlFor="s-custom" className="cursor-pointer text-sm font-normal">Custom:</Label>
                <Input
                  type="number" min={1} className="h-8 w-24"
                  value={customShops}
                  onChange={(e) => setCustomShops(Number(e.target.value) || 1)}
                  onFocus={() => setShopMode("custom")}
                />
                <span className="text-xs text-muted-foreground">shops</span>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="unlimited" id="s-unl" />
                <Label htmlFor="s-unl" className="cursor-pointer text-sm font-normal">Unlimited</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !planId}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Grant Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}