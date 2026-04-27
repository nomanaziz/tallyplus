import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const PLANS = ["free", "monthly", "yearly", "lifetime"];
const FEATURES = [
  { key: "purchase", label: "ক্রয় (Purchase)" },
  { key: "sale", label: "বিক্রয় (Sale)" },
  { key: "expense", label: "খরচ (Expense)" },
  { key: "products", label: "পণ্যের তালিকা (Products)" },
  { key: "due", label: "বাকি (Due)" },
  { key: "contacts_customer", label: "যোগাযোগ - গ্রাহক" },
  { key: "contacts_supplier", label: "যোগাযোগ - সাপ্লায়ার" },
  { key: "contacts_employee", label: "যোগাযোগ - কর্মচারী" },
  { key: "stock", label: "স্টক তালিকা" },
];

type Row = { plan_code: string; feature_key: string; limit_count: number };

export default function AdminUsageLimits() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("usage_limits").select("*");
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const get = (plan: string, feature: string) =>
    rows.find((r) => r.plan_code === plan && r.feature_key === feature)?.limit_count ?? 0;

  const set = (plan: string, feature: string, val: number) => {
    setRows((cur) => {
      const idx = cur.findIndex((r) => r.plan_code === plan && r.feature_key === feature);
      if (idx >= 0) {
        const c = [...cur]; c[idx] = { ...c[idx], limit_count: val }; return c;
      }
      return [...cur, { plan_code: plan, feature_key: feature, limit_count: val }];
    });
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("usage_limits").upsert(rows, { onConflict: "plan_code,feature_key" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usage Limits</h1>
          <p className="text-sm text-muted-foreground">প্ল্যান অনুযায়ী feature limit সেট করুন। -1 = unlimited।</p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Feature</th>
              {PLANS.map((p) => <th key={p} className="px-3 py-2 text-center font-semibold">{p}</th>)}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => (
              <tr key={f.key} className="border-t">
                <td className="px-3 py-2">{f.label}</td>
                {PLANS.map((p) => (
                  <td key={p} className="px-3 py-2 text-center">
                    <Input
                      type="number"
                      value={get(p, f.key)}
                      onChange={(e) => set(p, f.key, Number(e.target.value))}
                      className="h-9 w-20 text-center"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
