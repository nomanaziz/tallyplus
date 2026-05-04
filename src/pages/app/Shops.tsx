import { useNavigate, Link } from "@/lib/router";
import { useEffect, useState } from "react";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { AddShopDialog } from "@/components/app/AddShopDialog";
import { LogOut, Plus, Store, CheckCircle2, Lock, Trash2, ArrowRightLeft } from "lucide-react";
import { DeleteShopDialog } from "@/components/app/DeleteShopDialog";
import { TransferShopDialog } from "@/components/app/TransferShopDialog";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";



function ShopsPage() {
  const { lang } = useI18n();
  const { shops, current, setCurrent, refresh: refreshShops } = useShop();
  const { signOut, user } = useAuth();
  const nav = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [limit, setLimit] = useState<number>(1);
  const [delTarget, setDelTarget] = useState<{ id: string; name: string } | null>(null);
  const [transferTarget, setTransferTarget] = useState<{ id: string; name: string } | null>(null);

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
          <img src={logo} alt="" className="h-8 w-8 object-contain" />
          <span className="text-lg font-extrabold">Tally Plus</span>
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
                    (active ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40")
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
                    {active && <CheckCircle2 className="h-5 w-5 flex-none text-primary" />}
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <Button
                    onClick={() => select(s)}
                      variant={active ? "default" : "outline"}
                      className="h-10 flex-1 font-semibold"
                  >
                    {active
                      ? lang === "bn" ? "বর্তমান দোকান" : "Current Shop"
                      : lang === "bn" ? "সিলেক্ট করুন" : "Select"}
                  </Button>
                  {user?.id === s.owner_id && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 border-amber-300 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                        onClick={() => setTransferTarget({ id: s.id, name: s.name })}
                        title={lang === "bn" ? "দোকান হস্তান্তর" : "Transfer shop"}
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => setDelTarget({ id: s.id, name: s.name })}
                        title={lang === "bn" ? "দোকান মুছুন" : "Delete shop"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
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

      <DeleteShopDialog
        open={!!delTarget}
        onOpenChange={(v) => { if (!v) setDelTarget(null); }}
        shop={delTarget}
        onDeleted={async () => {
          // If we just deleted the current shop, clear it from local storage
          if (current && delTarget && current.id === delTarget.id) {
            if (typeof window !== "undefined") {
              localStorage.removeItem("tp_shop_id");
              localStorage.removeItem("tp_shop_current");
            }
          }
          setDelTarget(null);
          await refreshShops();
        }}
      />

      <AddShopDialog open={addOpen} onOpenChange={setAddOpen} onCreated={() => { /* refresh in dialog */ }} />
      <TransferShopDialog
        open={!!transferTarget}
        onOpenChange={(v) => { if (!v) setTransferTarget(null); }}
        shop={transferTarget}
      />
    </div>
  );
}
export default ShopsPage;
