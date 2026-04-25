import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { AddShopDialog } from "@/components/app/AddShopDialog";
import { LogOut, Plus, Store, CheckCircle2, Lock } from "lucide-react";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/shops")({
  head: () => ({ meta: [{ title: "দোকান সিলেক্ট করুন — Tally Plus" }] }),
  component: ShopsPage,
});

function ShopsPage() {
  const { lang } = useI18n();
  const { shops, current, setCurrent } = useShop();
  const { signOut, user } = useAuth();
  const nav = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [limit, setLimit] = useState<number>(1);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase.rpc("user_shop_limit", { _user_id: user.id });
      if (typeof data === "number") setLimit(data);
    })();
  }, [user, shops.length]);

  const atLimit = shops.length >= limit;

  const onAddClick = () => {
    if (atLimit) {
      toast.error(
        lang === "bn"
          ? `আপনার plan-এ সর্বোচ্চ ${limit} টি দোকান allowed। Upgrade করুন।`
          : `Your plan allows max ${limit} shop${limit === 1 ? "" : "s"}. Please upgrade.`
      );
      nav({ to: "/app/subscribe" });
      return;
    }
    setAddOpen(true);
  };

  const select = (s: (typeof shops)[number]) => {
    setCurrent(s);
    nav({ to: "/app/dashboard" });
  };

  return (
    <div className="min-h-full bg-muted/30">
      <header className="flex items-center justify-between border-b bg-background px-4 py-3">
        <Link to="/app/dashboard" className="flex items-center gap-2">
          <img src={logo} alt="" className="h-8 w-8" />
          <span className="text-lg font-extrabold">{lang === "bn" ? "হিসাবী" : "Hishabee"}</span>
        </Link>
        <Button
          variant="ghost"
          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          onClick={() => signOut().then(() => nav({ to: "/" }))}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {lang === "bn" ? "লগআউট" : "Log out"}
        </Button>
      </header>

      <div className="container px-4 py-6">
        <h1 className="mb-1 text-center text-2xl font-extrabold">
          {lang === "bn" ? "দোকান সিলেক্ট করুন" : "Select a Shop"}
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {lang === "bn"
            ? "একাধিক দোকান থাকলে যেকোনো একটি বেছে নিন"
            : "Choose one of your shops to continue"}
        </p>

        <p className="mb-4 text-center text-xs text-muted-foreground">
          {lang === "bn"
            ? `${shops.length} / ${limit} টি দোকান ব্যবহার হচ্ছে`
            : `${shops.length} of ${limit} shops used`}
        </p>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((s) => {
            const active = current?.id === s.id;
            return (
              <div
                key={s.id}
                className={
                  "flex flex-col rounded-2xl border-2 bg-background p-5 shadow-sm transition " +
                  (active ? "border-emerald-500 ring-2 ring-emerald-100" : "border-border hover:border-primary/40")
                }
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      <Store className="h-6 w-6" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{s.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {s.address || (lang === "bn" ? "ঠিকানা যোগ করা হয়নি" : "No address")}
                    </div>
                  </div>
                  {active && <CheckCircle2 className="h-5 w-5 flex-none text-emerald-500" />}
                </div>
                <Button
                  onClick={() => select(s)}
                  className={
                    "mt-auto h-10 w-full font-semibold " +
                    (active ? "bg-emerald-600 hover:bg-emerald-700" : "")
                  }
                >
                  {active
                    ? lang === "bn" ? "বর্তমান দোকান" : "Current Shop"
                    : lang === "bn" ? "সিলেক্ট করুন" : "Select"}
                </Button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={onAddClick}
            className={
              "flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 transition " +
              (atLimit
                ? "border-border bg-muted/30 text-muted-foreground hover:border-rose-300 hover:text-rose-600"
                : "border-border bg-background/50 text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary")
            }
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              {atLimit ? <Lock className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
            </div>
            <span className="font-semibold">
              {atLimit
                ? (lang === "bn" ? "Plan upgrade করুন" : "Upgrade plan to add")
                : (lang === "bn" ? "নতুন দোকান যুক্ত করুন" : "Add new shop")}
            </span>
            <span className="text-xs">
              {lang === "bn" ? `সর্বোচ্চ ${limit} টি অনুমোদিত` : `Max ${limit} allowed`}
            </span>
          </button>
        </div>
      </div>

      <AddShopDialog open={addOpen} onOpenChange={setAddOpen} onCreated={() => { /* refresh in dialog */ }} />
    </div>
  );
}