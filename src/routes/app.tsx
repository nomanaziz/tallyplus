import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { LogOut, Store, ShoppingCart, Package, Users, Wallet, BarChart3, CreditCard } from "lucide-react";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "ড্যাশবোর্ড — Tally Plus" }] }),
  component: AppHome,
});

function AppHome() {
  const { t, lang, setLang } = useI18n();
  const { user, profile, signOut, hasActiveSubscription, loading } = useAuth();
  const { shops, current, refresh: refreshShops, loading: shopsLoading } = useShop();
  const nav = useNavigate();
  const [shopName, setShopName] = useState("");
  const [creating, setCreating] = useState(false);
  const [stats, setStats] = useState({ sales: 0, purchases: 0, expenses: 0, receivable: 0, payable: 0, stockValue: 0 });

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!current) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const iso = today.toISOString();
    Promise.all([
      supabase.from("sales").select("total").eq("shop_id", current.id).gte("created_at", iso).is("deleted_at", null),
      supabase.from("purchases").select("total").eq("shop_id", current.id).gte("created_at", iso).is("deleted_at", null),
      supabase.from("expenses").select("amount").eq("shop_id", current.id).gte("created_at", iso).is("deleted_at", null),
      supabase.from("customers").select("due_balance").eq("shop_id", current.id).is("deleted_at", null),
      supabase.from("suppliers").select("due_balance").eq("shop_id", current.id).is("deleted_at", null),
      supabase.from("products").select("stock,cost_price").eq("shop_id", current.id).is("deleted_at", null),
    ]).then(([sales, purchases, expenses, customers, suppliers, products]) => {
      const sum = <T,>(arr: T[] | null, k: keyof T) => (arr ?? []).reduce((a, b) => a + Number(b[k] ?? 0), 0);
      setStats({
        sales: sum(sales.data, "total" as never),
        purchases: sum(purchases.data, "total" as never),
        expenses: sum(expenses.data, "amount" as never),
        receivable: sum(customers.data, "due_balance" as never),
        payable: sum(suppliers.data, "due_balance" as never),
        stockValue: (products.data ?? []).reduce((a, p: { stock: number; cost_price: number }) => a + Number(p.stock) * Number(p.cost_price), 0),
      });
    });
  }, [current?.id]);

  const createShop = async () => {
    if (!user || shopName.trim().length < 2) { toast.error(lang === "bn" ? "দোকানের নাম দিন" : "Enter shop name"); return; }
    setCreating(true);
    const { error } = await supabase.from("shops").insert({ owner_id: user.id, name: shopName.trim() });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    setShopName(""); await refreshShops();
    toast.success(lang === "bn" ? "দোকান তৈরি হয়েছে" : "Shop created");
  };

  if (loading || shopsLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">...</div>;
  }

  // No shop yet → show setup card
  if (shops.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/30 to-background p-4">
        <div className="w-full max-w-sm rounded-3xl border bg-card p-6 shadow-xl">
          <div className="mb-4 flex items-center gap-2"><img src={logo} alt="" className="h-8 w-8" /><span className="font-extrabold">{t("appName")}</span></div>
          <h1 className="text-2xl font-bold">{t("setupShop")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{lang === "bn" ? "শুরু করতে আপনার দোকানের নাম দিন" : "Enter your shop name to begin"}</p>
          <div className="mt-6 space-y-3">
            <Label htmlFor="shop">{t("shopName")}</Label>
            <Input id="shop" value={shopName} onChange={(e) => setShopName(e.target.value)} className="h-12 text-base" placeholder={lang === "bn" ? "যেমন: আল্লাহর দান স্টোর" : "e.g. My Shop"} />
            <Button onClick={createShop} disabled={creating} className="h-12 w-full text-base font-semibold">{creating ? "..." : t("create")}</Button>
          </div>
        </div>
      </div>
    );
  }

  const tiles = [
    { label: t("todaysSales"), v: stats.sales },
    { label: t("todaysPurchase"), v: stats.purchases },
    { label: t("todaysExpense"), v: stats.expenses },
    { label: t("totalReceivable"), v: stats.receivable },
    { label: t("totalPayable"), v: stats.payable },
    { label: t("totalStock"), v: stats.stockValue },
  ];

  const quickLinks = [
    { icon: ShoppingCart, label: t("sales"), to: "/app" },
    { icon: Package, label: t("products"), to: "/app" },
    { icon: Users, label: t("customers"), to: "/app" },
    { icon: Wallet, label: t("expenses"), to: "/app" },
    { icon: BarChart3, label: t("reports"), to: "/app" },
    { icon: CreditCard, label: t("subscribe"), to: "/" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="h-7 w-7" />
            <div className="leading-tight">
              <div className="text-sm font-bold">{current?.name}</div>
              <div className="text-[10px] text-muted-foreground">{profile?.phone}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(lang === "bn" ? "en" : "bn")} className="rounded-md border px-2 py-1 text-xs font-semibold">{lang === "bn" ? "EN" : "বাং"}</button>
            <Button size="sm" variant="outline" onClick={() => signOut().then(() => nav({ to: "/" }))}><LogOut className="mr-1 h-4 w-4" />{t("logout")}</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {!hasActiveSubscription && (
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-warning/40 bg-warning/10 p-4">
            <div>
              <p className="font-semibold">{t("subscriptionExpired")}</p>
              <p className="text-sm text-muted-foreground">{lang === "bn" ? "সব ফিচার আনলক করতে সাবস্ক্রাইব করুন।" : "Subscribe to unlock all features."}</p>
            </div>
            <Button asChild><a href="/#pricing">{t("subscribe")}</a></Button>
          </div>
        )}

        <h1 className="text-xl font-extrabold">{t("dashboard")}</h1>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          {tiles.map((x) => (
            <div key={x.label} className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="text-xs text-muted-foreground">{x.label}</div>
              <div className="mt-1 text-xl font-extrabold">{fmtMoney(x.v, lang)}</div>
            </div>
          ))}
        </div>

        <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-muted-foreground">{lang === "bn" ? "দ্রুত অ্যাক্সেস" : "Quick access"}</h2>
        <div className="mt-3 grid grid-cols-3 gap-3 md:grid-cols-6">
          {quickLinks.map((q) => (
            <Link key={q.label} to={q.to} className="group flex flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 group-hover:bg-primary"><q.icon className="h-5 w-5" /></div>
              <span className="text-xs font-semibold">{q.label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
          <Store className="mx-auto mb-2 h-8 w-8 text-primary" />
          {lang === "bn"
            ? "ফাউন্ডেশন প্রস্তুত। পরের ধাপে: POS বিলিং, প্রোডাক্ট, কাস্টমার, খরচ, রিপোর্ট, অফলাইন সিঙ্ক ও অ্যাডমিন প্যানেল।"
            : "Foundation ready. Next: POS billing, products, customers, expenses, reports, offline sync & admin panel."}
        </div>
      </main>
    </div>
  );
}