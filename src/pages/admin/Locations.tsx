import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, ChevronDown, ChevronRight, MapPin, Database } from "lucide-react";
import { toast } from "sonner";
import bdGeo from "@/data/bd_geo.json";

type Row = { id: string; legacy_id: string; name_bn: string; name_en: string; is_active: boolean; division_legacy_id?: string; district_legacy_id?: string };

export default function AdminLocations() {
  const [divs, setDivs] = useState<Row[]>([]);
  const [dists, setDists] = useState<Row[]>([]);
  const [upas, setUpas] = useState<Row[]>([]);
  const [openDiv, setOpenDiv] = useState<string | null>(null);
  const [openDist, setOpenDist] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    setLoading(true);
    const [d, dt, u] = await Promise.all([
      supabase.from("bd_divisions").select("*").order("name_bn"),
      supabase.from("bd_districts").select("*").order("name_bn"),
      supabase.from("bd_upazilas").select("*").order("name_bn"),
    ]);
    setDivs((d.data ?? []) as Row[]);
    setDists((dt.data ?? []) as Row[]);
    setUpas((u.data ?? []) as Row[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const seed = async () => {
    if (!confirm("বাংলাদেশের সব Division, District, Upazila ডেটাবেজে যোগ করতে চান?")) return;
    setSeeding(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-bd-geo`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify(bdGeo),
        },
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Seed failed");
      toast.success(`Seeded: ${d.divisions} division, ${d.districts} district, ${d.upazilas} upazila`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSeeding(false);
    }
  };

  const toggle = async (table: "bd_divisions" | "bd_districts" | "bd_upazilas", id: string, val: boolean) => {
    const { error } = await supabase.from(table).update({ is_active: val }).eq("id", id);
    if (error) return toast.error(error.message);
    await load();
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><MapPin className="h-6 w-6" /> Locations (এলাকা)</h1>
          <p className="text-sm text-muted-foreground">Division, District, Upazila — toggle to enable/disable</p>
        </div>
        <Button onClick={seed} disabled={seeding} variant="outline">
          {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
          {divs.length === 0 ? "Seed BD Data" : "Re-sync from JSON"}
        </Button>
      </div>

      {divs.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          কোনো ডেটা নেই। উপরের "Seed BD Data" বাটন চাপুন।
        </Card>
      ) : (
        <div className="space-y-2">
          {divs.map((div) => {
            const distOfDiv = dists.filter((d) => d.division_legacy_id === div.legacy_id);
            const expanded = openDiv === div.id;
            return (
              <Card key={div.id} className="overflow-hidden">
                <div className="flex items-center gap-2 p-3">
                  <button onClick={() => setOpenDiv(expanded ? null : div.id)} className="flex flex-1 items-center gap-2 text-left">
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-semibold">{div.name_bn}</span>
                    <span className="text-xs text-muted-foreground">({div.name_en}) — {distOfDiv.length} জেলা</span>
                  </button>
                  <Switch checked={div.is_active} onCheckedChange={(v) => toggle("bd_divisions", div.id, v)} />
                </div>
                {expanded && (
                  <div className="space-y-1 border-t bg-muted/30 p-3">
                    {distOfDiv.map((dist) => {
                      const upaOfDist = upas.filter((u) => u.district_legacy_id === dist.legacy_id);
                      const dExp = openDist === dist.id;
                      return (
                        <div key={dist.id} className="rounded-md border bg-background">
                          <div className="flex items-center gap-2 p-2">
                            <button onClick={() => setOpenDist(dExp ? null : dist.id)} className="flex flex-1 items-center gap-2 text-left">
                              {dExp ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              <span className="text-sm font-medium">{dist.name_bn}</span>
                              <span className="text-xs text-muted-foreground">({upaOfDist.length} উপজেলা)</span>
                            </button>
                            <Switch checked={dist.is_active} onCheckedChange={(v) => toggle("bd_districts", dist.id, v)} />
                          </div>
                          {dExp && (
                            <div className="grid grid-cols-2 gap-1 border-t p-2 sm:grid-cols-3">
                              {upaOfDist.map((u) => (
                                <div key={u.id} className="flex items-center justify-between gap-2 rounded bg-muted/50 px-2 py-1.5 text-xs">
                                  <span>{u.name_bn}</span>
                                  <Switch checked={u.is_active} onCheckedChange={(v) => toggle("bd_upazilas", u.id, v)} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}