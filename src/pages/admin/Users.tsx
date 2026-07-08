import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, ShieldOff, Ban, Check, Loader2, Gift, XCircle, Infinity as InfinityIcon, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { getCountry, COUNTRIES } from "@/lib/countries";
import { GrantAccessDialog } from "@/components/admin/GrantAccessDialog";

// Show phone in plain English digits, without +88 country prefix.
// DB may store as +8801xxxxxxxxx, 8801xxxxxxxxx, or ০১xxxxxxxxx — normalize all.
function displayPhone(p: string | null | undefined): string {
  if (!p) return "—";
  // convert bengali digits (U+09E6..U+09EF) → ascii by code-point math
  let s = p.replace(/[\u09E6-\u09EF]/g, (d) => String(d.charCodeAt(0) - 0x09E6));
  s = s.replace(/[^\d+]/g, "");
  s = s.replace(/^\+?88/, "");
  if (!s.startsWith("0") && s.length === 10) s = "0" + s;
  return s || "—";
}

type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  is_suspended: boolean;
  created_at: string;
  country_code: string | null;
  shop_limit_override: number | null;
  unlimited_shops: boolean | null;
};

type Row = Profile & {
  shopCount: number;
  isAdmin: boolean;
  hasWishlist: boolean;
  planName?: string | null;
  expiresAt?: string | null;
};

function UsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "owner" | "admin" | "suspended">("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [grantTarget, setGrantTarget] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: shops }, { data: subs }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,phone,is_suspended,created_at,country_code,shop_limit_override,unlimited_shops").order("created_at", { ascending: false }).limit(500),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("shops").select("owner_id").is("deleted_at", null),
      supabase.from("subscriptions").select("user_id,expires_at,status,plan_id,subscription_plans(name_bn,code)").in("status", ["active","trial"]).gt("expires_at", new Date().toISOString()),
    ]);
    const adminSet = new Set((roles ?? []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id));
    const shopCounts = new Map<string, number>();
    for (const s of shops ?? []) {
      shopCounts.set((s as any).owner_id, (shopCounts.get((s as any).owner_id) ?? 0) + 1);
    }
    const subMap = new Map<string, { plan: string; expires: string }>();
    for (const s of (subs ?? []) as any[]) {
      const planName = s.subscription_plans?.name_bn || s.subscription_plans?.code || "—";
      const prev = subMap.get(s.user_id);
      if (!prev || new Date(s.expires_at) > new Date(prev.expires)) {
        subMap.set(s.user_id, { plan: planName, expires: s.expires_at });
      }
    }
    const out: Row[] = ((profiles as Profile[]) ?? []).map((p) => ({
      ...p,
      isAdmin: adminSet.has(p.id),
      shopCount: shopCounts.get(p.id) ?? 0,
      hasWishlist: false,
      planName: subMap.get(p.id)?.plan ?? null,
      expiresAt: subMap.get(p.id)?.expires ?? null,
    }));
    setRows(out);
    setLoading(false);
  };
  const revoke = async (r: Row) => {
    if (!confirm(`Revoke access for ${r.full_name || r.phone || "user"}?`)) return;
    const { error } = await supabase.rpc("admin_revoke_access", { _user_id: r.id });
    if (error) return toast.error(error.message);
    toast.success("Access revoked");
    void load();
  };


  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (filter === "owner") list = list.filter((r) => r.shopCount > 0);
    else if (filter === "admin") list = list.filter((r) => r.isAdmin);
    else if (filter === "suspended") list = list.filter((r) => r.is_suspended);
    if (countryFilter !== "all") list = list.filter((r) => (r.country_code || "") === countryFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.full_name ?? "").toLowerCase().includes(q) ||
          (r.phone ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, filter, search, countryFilter]);

  const countryCounts = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const k = r.country_code || "—";
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const toggleSuspend = async (r: Row) => {
    const { error } = await supabase.from("profiles").update({ is_suspended: !r.is_suspended }).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(r.is_suspended ? "Unsuspended" : "Suspended");
    void load();
  };

  const resetPin = async (r: Row) => {
    if (!r.phone) {
      return toast.error("This user has no phone — PIN login is not available");
    }
    const newPin = window.prompt(
      `Reset PIN for ${r.full_name || displayPhone(r.phone)} — enter new 4-digit PIN:`,
      "",
    );
    if (newPin === null) return;
    const pin = newPin.trim();
    if (!/^\d{4}$/.test(pin)) return toast.error("PIN must be exactly 4 digits");
    const { data, error } = await supabase.functions.invoke("admin-reset-user-pin", {
      body: { user_id: r.id, new_pin: pin },
    });
    if (error) return toast.error(error.message);
    if ((data as { error?: string })?.error) return toast.error((data as { error: string }).error);
    toast.success(`PIN reset to ${pin}`);
  };

  const toggleAdmin = async (r: Row) => {
    if (r.isAdmin) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", r.id).eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Admin role removed");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: r.id, role: "admin" });
      if (error) return toast.error(error.message);
      toast.success("Promoted to admin");
    }
    void load();
  };

  const userType = (r: Row) =>
    r.isAdmin ? "admin" : r.shopCount > 0 ? "owner" : "buyer";

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-3 sm:space-y-6 sm:p-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Users</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">Manage all users</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="owner">Shop Owners</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} users</span>
      </div>

      {countryCounts.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap gap-2 p-3 text-xs">
            <span className="font-semibold">Users by country:</span>
            {countryCounts.slice(0, 12).map(([code, n]) => {
              const c = getCountry(code);
              return (
                <Badge key={code} variant="outline" className="cursor-pointer" onClick={() => setCountryFilter(code === "—" ? "all" : code)}>
                  {c ? `${c.flag} ${c.code}` : code} · {n}
                </Badge>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Shops</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const t = userType(r);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                      <TableCell className="tabular-nums">{displayPhone(r.phone)}</TableCell>
                      <TableCell className="text-xs">
                        {(() => { const c = getCountry(r.country_code); return c ? `${c.flag} ${c.code}` : "—"; })()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={t === "admin" ? "default" : t === "owner" ? "secondary" : "outline"}>
                          {t}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>{r.shopCount}</span>
                          {r.unlimited_shops ? (
                            <Badge variant="secondary" className="gap-0.5"><InfinityIcon className="h-3 w-3" />∞</Badge>
                          ) : r.shop_limit_override ? (
                            <Badge variant="secondary">/{r.shop_limit_override}</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.planName ? (
                          <div>
                            <div className="font-medium">{r.planName}</div>
                            <div className="text-muted-foreground">till {new Date(r.expiresAt!).toLocaleDateString("en-GB")}</div>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {r.is_suspended ? (
                          <Badge variant="destructive">Suspended</Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("en-GB")}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="default" size="sm" onClick={() => setGrantTarget(r)}>
                          <Gift className="mr-1 h-3.5 w-3.5" />Grant
                        </Button>
                        {(r.planName || r.unlimited_shops || r.shop_limit_override) && (
                          <Button variant="outline" size="sm" onClick={() => revoke(r)}>
                            <XCircle className="mr-1 h-3.5 w-3.5" />Revoke
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => toggleAdmin(r)}>
                          {r.isAdmin ? (
                            <><ShieldOff className="mr-1 h-3.5 w-3.5" />Revoke</>
                          ) : (
                            <><ShieldCheck className="mr-1 h-3.5 w-3.5" />Make Admin</>
                          )}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => toggleSuspend(r)}>
                          {r.is_suspended ? (
                            <><Check className="mr-1 h-3.5 w-3.5" />Unsuspend</>
                          ) : (
                            <><Ban className="mr-1 h-3.5 w-3.5" />Suspend</>
                          )}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => resetPin(r)} title="Reset user's 4-digit login PIN">
                          <KeyRound className="mr-1 h-3.5 w-3.5" />Reset PIN
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <GrantAccessDialog
        open={!!grantTarget}
        onOpenChange={(v) => !v && setGrantTarget(null)}
        user={grantTarget}
        onDone={() => void load()}
      />
    </div>
  );
}

export default UsersPage;
