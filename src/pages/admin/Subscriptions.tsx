import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { AdminSearchBar, matches } from "@/components/admin/AdminSearchBar";



function SubsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      const list = subs ?? [];
      if (list.length) {
        const userIds = [...new Set(list.map((s: any) => s.user_id))];
        const planIds = [...new Set(list.map((s: any) => s.plan_id))];
        const [{ data: profiles }, { data: plans }] = await Promise.all([
          supabase.from("profiles").select("id,full_name,phone").in("id", userIds),
          supabase.from("subscription_plans").select("id,name_bn,price_bdt").in("id", planIds),
        ]);
        const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
        const planMap = new Map((plans ?? []).map((p: any) => [p.id, p]));
        setItems(list.map((s: any) => ({ ...s, profile: pMap.get(s.user_id), plan: planMap.get(s.plan_id) })));
      } else setItems([]);
      setLoading(false);
    })();
  }, []);

  const isExpired = (s: any) => new Date(s.expires_at) < new Date();

  const filtered = useMemo(
    () => items.filter((s) => matches(search, s.profile?.full_name, s.profile?.phone, s.plan?.name_bn, s.status)),
    [items, search],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-3 sm:space-y-6 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">সকল subscription</p>
      </div>
      <AdminSearchBar value={search} onChange={setSearch} count={filtered.length} placeholder="Name, phone, plan, status" />
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.profile?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{s.profile?.phone}</div>
                    </TableCell>
                    <TableCell>{s.plan?.name_bn ?? "—"}</TableCell>
                    <TableCell>
                      {s.status === "active" && !isExpired(s) ? (
                        <Badge>Active</Badge>
                      ) : isExpired(s) ? (
                        <Badge variant="secondary">Expired</Badge>
                      ) : (
                        <Badge variant="outline">{s.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{new Date(s.starts_at).toLocaleDateString("en-GB")}</TableCell>
                    <TableCell className="text-xs">{new Date(s.expires_at).toLocaleDateString("en-GB")}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {search ? "কোনো ফলাফল নেই" : "কোন subscription নেই"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SubsPage;
