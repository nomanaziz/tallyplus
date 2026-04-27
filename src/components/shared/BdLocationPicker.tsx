import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Row = { legacy_id: string; name_bn: string; name_en: string; is_active: boolean };
type DRow = Row & { division_legacy_id?: string; district_legacy_id?: string };

export type BdLocation = {
  division: string | null;
  district: string | null;
  upazila: string | null;
  area: string | null;
};

export function BdLocationPicker({
  value,
  onChange,
  required = false,
  showArea = true,
}: {
  value: BdLocation;
  onChange: (v: BdLocation) => void;
  required?: boolean;
  showArea?: boolean;
}) {
  const [divs, setDivs] = useState<Row[]>([]);
  const [dists, setDists] = useState<DRow[]>([]);
  const [upas, setUpas] = useState<DRow[]>([]);

  useEffect(() => {
    void supabase
      .from("bd_divisions")
      .select("legacy_id,name_bn,name_en,is_active")
      .eq("is_active", true)
      .order("name_bn")
      .then(({ data }) => setDivs((data ?? []) as Row[]));
  }, []);

  useEffect(() => {
    if (!value.division) { setDists([]); return; }
    const div = divs.find((d) => d.name_bn === value.division || d.name_en === value.division);
    if (!div) return;
    void supabase
      .from("bd_districts")
      .select("legacy_id,division_legacy_id,name_bn,name_en,is_active")
      .eq("division_legacy_id", div.legacy_id)
      .eq("is_active", true)
      .order("name_bn")
      .then(({ data }) => setDists((data ?? []) as DRow[]));
  }, [value.division, divs]);

  useEffect(() => {
    if (!value.district) { setUpas([]); return; }
    const dist = dists.find((d) => d.name_bn === value.district || d.name_en === value.district);
    if (!dist) return;
    void supabase
      .from("bd_upazilas")
      .select("legacy_id,district_legacy_id,name_bn,name_en,is_active")
      .eq("district_legacy_id", dist.legacy_id)
      .eq("is_active", true)
      .order("name_bn")
      .then(({ data }) => setUpas((data ?? []) as DRow[]));
  }, [value.district, dists]);

  const star = required ? <span className="text-destructive"> *</span> : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label>বিভাগ{star}</Label>
        <Select
          value={value.division ?? ""}
          onValueChange={(v) => onChange({ ...value, division: v, district: null, upazila: null })}
        >
          <SelectTrigger><SelectValue placeholder="বিভাগ বাছাই করুন" /></SelectTrigger>
          <SelectContent>
            {divs.map((d) => (
              <SelectItem key={d.legacy_id} value={d.name_bn}>{d.name_bn}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>জেলা{star}</Label>
        <Select
          value={value.district ?? ""}
          onValueChange={(v) => onChange({ ...value, district: v, upazila: null })}
          disabled={!value.division || dists.length === 0}
        >
          <SelectTrigger><SelectValue placeholder="জেলা বাছাই করুন" /></SelectTrigger>
          <SelectContent>
            {dists.map((d) => (
              <SelectItem key={d.legacy_id} value={d.name_bn}>{d.name_bn}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>উপজেলা/থানা{star}</Label>
        <Select
          value={value.upazila ?? ""}
          onValueChange={(v) => onChange({ ...value, upazila: v })}
          disabled={!value.district || upas.length === 0}
        >
          <SelectTrigger><SelectValue placeholder="উপজেলা/থানা বাছাই করুন" /></SelectTrigger>
          <SelectContent>
            {upas.map((d) => (
              <SelectItem key={d.legacy_id} value={d.name_bn}>{d.name_bn}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {showArea && (
        <div>
          <Label>এলাকা/মহল্লা{star}</Label>
          <Input
            value={value.area ?? ""}
            onChange={(e) => onChange({ ...value, area: e.target.value })}
            placeholder="যেমন: ধানমন্ডি ৩২, মিরপুর ১০"
          />
        </div>
      )}
    </div>
  );
}

export function isBdLocationComplete(v: BdLocation, requireArea = true) {
  return Boolean(v.division && v.district && v.upazila && (!requireArea || (v.area && v.area.trim().length > 0)));
}