import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type LocationValue = {
  division: string | null;
  district: string | null;
  upazila: string | null;
  area: string | null;
};

type Row = {
  legacy_id: string;
  name_bn: string;
  name_en: string;
  is_active: boolean;
  division_legacy_id?: string;
  district_legacy_id?: string;
};

const STALE = 5 * 60 * 1000; // 5 min — divisions/districts/upazilas barely change

function useDivisions() {
  return useQuery({
    queryKey: ["bd_divisions"],
    staleTime: STALE,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("bd_divisions")
        .select("legacy_id,name_bn,name_en,is_active")
        .eq("is_active", true)
        .order("name_bn");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

function useDistricts(divisionLegacyId: string | null) {
  return useQuery({
    queryKey: ["bd_districts", divisionLegacyId],
    enabled: !!divisionLegacyId,
    staleTime: STALE,
    queryFn: async (): Promise<Row[]> => {
      if (!divisionLegacyId) return [];
      const { data, error } = await supabase
        .from("bd_districts")
        .select("legacy_id,name_bn,name_en,is_active,division_legacy_id")
        .eq("is_active", true)
        .eq("division_legacy_id", divisionLegacyId)
        .order("name_bn");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

function useUpazilas(districtLegacyId: string | null) {
  return useQuery({
    queryKey: ["bd_upazilas", districtLegacyId],
    enabled: !!districtLegacyId,
    staleTime: STALE,
    queryFn: async (): Promise<Row[]> => {
      if (!districtLegacyId) return [];
      const { data, error } = await supabase
        .from("bd_upazilas")
        .select("legacy_id,name_bn,name_en,is_active,district_legacy_id")
        .eq("is_active", true)
        .eq("district_legacy_id", districtLegacyId)
        .order("name_bn");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

/**
 * Cascading picker for Bangladesh Division → District → Upazila + free-text Area.
 * Reads from the super-admin `bd_*` tables (single source of truth).
 * Stores Bengali names as plain text so existing free-text fields stay readable.
 */
export function LocationPicker({
  value,
  onChange,
  disabled,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  disabled?: boolean;
}) {
  const divisions = useDivisions();

  // Resolve current division → its legacy_id (we store name_bn, but query by legacy_id)
  const currentDivisionLegacy = useMemo(() => {
    if (!value.division || !divisions.data) return null;
    return divisions.data.find((d) => d.name_bn === value.division)?.legacy_id ?? null;
  }, [value.division, divisions.data]);

  const districts = useDistricts(currentDivisionLegacy);

  const currentDistrictLegacy = useMemo(() => {
    if (!value.district || !districts.data) return null;
    return districts.data.find((d) => d.name_bn === value.district)?.legacy_id ?? null;
  }, [value.district, districts.data]);

  const upazilas = useUpazilas(currentDistrictLegacy);

  // If saved district/upazila is no longer valid (e.g. division changed), clear it.
  useEffect(() => {
    if (value.district && districts.data && districts.data.length > 0) {
      const exists = districts.data.some((d) => d.name_bn === value.district);
      if (!exists) onChange({ ...value, district: null, upazila: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districts.data]);

  useEffect(() => {
    if (value.upazila && upazilas.data && upazilas.data.length > 0) {
      const exists = upazilas.data.some((u) => u.name_bn === value.upazila);
      if (!exists) onChange({ ...value, upazila: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upazilas.data]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label>বিভাগ</Label>
        <Select
          value={value.division ?? ""}
          onValueChange={(v) => onChange({ division: v || null, district: null, upazila: null, area: value.area })}
          disabled={disabled || divisions.isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={divisions.isLoading ? "লোড হচ্ছে…" : "বিভাগ নির্বাচন করুন"} />
          </SelectTrigger>
          <SelectContent>
            {(divisions.data ?? []).map((d) => (
              <SelectItem key={d.legacy_id} value={d.name_bn}>
                {d.name_bn} <span className="text-xs text-muted-foreground">({d.name_en})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>জেলা</Label>
        <Select
          value={value.district ?? ""}
          onValueChange={(v) => onChange({ ...value, district: v || null, upazila: null })}
          disabled={disabled || !value.division || districts.isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={!value.division ? "প্রথমে বিভাগ" : districts.isLoading ? "লোড হচ্ছে…" : "জেলা নির্বাচন করুন"} />
          </SelectTrigger>
          <SelectContent>
            {(districts.data ?? []).map((d) => (
              <SelectItem key={d.legacy_id} value={d.name_bn}>
                {d.name_bn} <span className="text-xs text-muted-foreground">({d.name_en})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>উপজেলা / থানা</Label>
        <Select
          value={value.upazila ?? ""}
          onValueChange={(v) => onChange({ ...value, upazila: v || null })}
          disabled={disabled || !value.district || upazilas.isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={!value.district ? "প্রথমে জেলা" : upazilas.isLoading ? "লোড হচ্ছে…" : "উপজেলা নির্বাচন করুন"} />
          </SelectTrigger>
          <SelectContent>
            {(upazilas.data ?? []).map((u) => (
              <SelectItem key={u.legacy_id} value={u.name_bn}>
                {u.name_bn} <span className="text-xs text-muted-foreground">({u.name_en})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>এলাকা / গ্রাম</Label>
        <Input
          value={value.area ?? ""}
          onChange={(e) => onChange({ ...value, area: e.target.value || null })}
          placeholder="যেমন: মধ্যবাড্ডা, ব্লক C"
          disabled={disabled}
        />
      </div>
    </div>
  );
}