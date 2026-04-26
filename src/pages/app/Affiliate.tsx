import { Link } from "@/lib/router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Share2, Wallet, Users, TrendingUp, Award, Loader2 } from "lucide-react";

type Affiliate = {
  id: string; full_name: string; phone: string; email: string | null;
  referral_code: string; total_referrals: number; total_commission: number;
  status: string; current_tier_id: string | null;
};
type Tier = { id: string; name: string; commission_pct: number };
type Referral = { id: string; referral_code: string; status: string; created_at: string; converted_at: string | null };
type Commission = { id: string; subscription_amount: number; commission_pct: number; commission_amount: number; status: string; created_at: string };

({
  component: AffiliateDashboard,
});

function AffiliateDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [aff, setAff] = useState<Affiliate | null>(null);
  const [tier, setTier] = useState<Tier | null>(null);
  const [refs, setRefs] = useState<Referral[]>([]);
  const [comms, setComms] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      setLoading(true);
      const { data } = await supabase.from("affiliates").select("*").eq("user_id", user.id).maybeSingle();
      const a = (data as Affiliate | null) ?? null;
      setAff(a);
      if (a) {
        const [{ data: t }, { data: r }, { data: c }] = await Promise.all([
          a.current_tier_id
            ? supabase.from("affiliate_tiers").select("id,name,commission_pct").eq("id", a.current_tier_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase.from("affiliate_referrals").select("*").eq("affiliate_id", a.id).order("created_at", { ascending: false }),
          supabase.from("affiliate_commissions").select("*").eq("affiliate_id", a.id).order("created_at", { ascending: false }),
        ]);
        setTier((t as Tier | null) ?? null);
        setRefs((r as Referral[]) ?? []);
        setComms((c as Commission[]) ?? []);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const link = useMemo(() => {
    if (!aff || typeof window === "undefined") return "";
    return `${window.location.origin}/?ref=${aff.referral_code}`;
  }, [aff]);

  const pendingPayout = useMemo(
    () => comms.filter((c) => c.status !== "paid").reduce((s, c) => s + Number(c.commission_amount || 0), 0),
    [comms],
  );

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("কপি হয়েছে"));
  };

  if (authLoading || loading) {
    return <div className="container px-4 py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!aff) {
    return (
      <div className="container px-4 py-8">
        <div className="mx-auto max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
          <Award className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-3 text-lg font-bold">গ্রোথ পার্টনার হয়ে যান</h2>
          <p className="mt-1 text-sm text-muted-foreground">প্রতিটি সফল রেফারেলে কমিশন আয় করুন।</p>
          <Link to="/affiliate/register"><Button className="mt-4 w-full">রেজিস্ট্রেশন করুন</Button></Link>
          <Link to="/affiliate"><Button variant="outline" className="mt-2 w-full">প্রোগ্রাম সম্পর্কে জানুন</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">গ্রোথ পার্টনার</div>
          <h1 className="text-xl font-extrabold">{aff.full_name}</h1>
        </div>
        <Badge variant={aff.status === "active" ? "default" : "secondary"}>{aff.status}</Badge>
      </div>

      <Tabs defaultValue="dashboard" className="mt-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="dashboard">ড্যাশবোর্ড</TabsTrigger>
          <TabsTrigger value="share">শেয়ার লিংক</TabsTrigger>
          <TabsTrigger value="referrals">রেফারেল ({refs.length})</TabsTrigger>
          <TabsTrigger value="commissions">কমিশন ({comms.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard icon={<Users className="h-4 w-4" />} label="মোট রেফারেল" value={String(aff.total_referrals)} />
            <StatCard icon={<TrendingUp className="h-4 w-4" />} label="কনভার্ট" value={String(comms.length)} />
            <StatCard icon={<Wallet className="h-4 w-4" />} label="মোট আয়" value={`৳${Number(aff.total_commission).toLocaleString()}`} />
            <StatCard icon={<Wallet className="h-4 w-4" />} label="বকেয়া" value={`৳${pendingPayout.toLocaleString()}`} />
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">বর্তমান টিয়ার</div>
              <div className="mt-1 flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <span className="text-lg font-bold">{tier?.name ?? "Bronze"}</span>
                <Badge variant="outline">{Number(tier?.commission_pct ?? 15)}% কমিশন</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="share" className="mt-4">
          <Card>
            <CardContent className="space-y-3 p-4">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">আপনার রেফারেল কোড</div>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-lg font-bold tracking-wider">{aff.referral_code}</code>
                  <Button size="icon" variant="outline" onClick={() => copy(aff.referral_code)}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">শেয়ার লিংক</div>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 text-xs">{link}</code>
                  <Button size="icon" variant="outline" onClick={() => copy(link)}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <a href={`https://wa.me/?text=${encodeURIComponent("Tally Plus অ্যাপে রেজিস্ট্রেশন করুন: " + link)}`} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full"><Share2 className="mr-1 h-4 w-4" /> WhatsApp</Button>
                </a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full"><Share2 className="mr-1 h-4 w-4" /> Facebook</Button>
                </a>
                <Button variant="outline" onClick={() => copy(link)}><Copy className="mr-1 h-4 w-4" /> Copy</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="mt-4">
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr><th className="px-3 py-2 text-left">তারিখ</th><th className="px-3 py-2 text-left">কোড</th><th className="px-3 py-2 text-left">স্ট্যাটাস</th></tr>
              </thead>
              <tbody>
                {refs.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2">{r.referral_code}</td>
                    <td className="px-3 py-2"><Badge variant={r.status === "converted" ? "default" : "secondary"}>{r.status}</Badge></td>
                  </tr>
                ))}
                {refs.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">এখনো কোনো রেফারেল নেই</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="commissions" className="mt-4">
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">তারিখ</th>
                  <th className="px-3 py-2 text-right">সাবস্ক্রিপশন</th>
                  <th className="px-3 py-2 text-right">%</th>
                  <th className="px-3 py-2 text-right">কমিশন</th>
                  <th className="px-3 py-2 text-left">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody>
                {comms.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-3 py-2">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-right">৳{Number(c.subscription_amount).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{Number(c.commission_pct)}%</td>
                    <td className="px-3 py-2 text-right font-semibold">৳{Number(c.commission_amount).toLocaleString()}</td>
                    <td className="px-3 py-2"><Badge variant={c.status === "paid" ? "default" : "secondary"}>{c.status}</Badge></td>
                  </tr>
                ))}
                {comms.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">এখনো কোনো কমিশন নেই</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="mt-1 text-lg font-extrabold">{value}</div>
      </CardContent>
    </Card>
  );
}
export default AffiliateDashboard;
