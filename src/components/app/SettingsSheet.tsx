import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useI18n, type Lang, LANG_NAMES } from "@/lib/i18n";
import { COUNTRIES } from "@/lib/countries";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@/lib/router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { ColorThemeInline } from "./ColorThemePicker";
import { toast } from "sonner";
import { ActiveDevicesDialog } from "./ActiveDevicesDialog";
import {
  ArrowLeftRight,
  ChevronRight,
  LayoutDashboard,
  Crown,
  Languages,
  Coins,
  Sun,
  Hash,
  BarChart3,
  Smartphone,
  GraduationCap,
  Users,
  Facebook,
  HelpCircle,
  LogOut,
  Link as LinkIcon,
  MessageCircle,
  Globe,
  Youtube,
  BookOpen,
  Mail,
  User as UserIcon,
  Store,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Facebook,
  HelpCircle,
  MessageCircle,
  Globe,
  Youtube,
  BookOpen,
  Mail,
  Link: LinkIcon,
};

type AppLink = {
  key: string;
  label_bn: string;
  label_en: string;
  url: string;
  link_type: "internal" | "external";
  icon: string;
  section: string;
  sort_order: number;
  is_active: boolean;
};

type RowProps = {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  iconTint?: string;
};

function SettingsRow({ icon, label, sub, right, onClick, iconTint = "bg-muted text-muted-foreground" }: RowProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-accent/40"
    >
      <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${iconTint}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-foreground">{label}</span>
        {sub && <span className="block truncate text-[11px] text-muted-foreground">{sub}</span>}
      </span>
      <span className="flex flex-none items-center gap-1 text-xs text-muted-foreground">
        {right ?? (onClick ? <ChevronRight className="h-4 w-4" /> : null)}
      </span>
    </Comp>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted-foreground/80">{title}</h3>
      <div className="overflow-hidden rounded-2xl border bg-card divide-y divide-border/60">
        {children}
      </div>
    </section>
  );
}

function QuickTile({
  icon,
  label,
  onClick,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition active:scale-[0.98] ${tint}`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-background shadow-sm">
        {icon}
      </span>
      <span className="text-xs font-semibold leading-tight text-foreground">{label}</span>
    </button>
  );
}

export function SettingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { lang, setLang, t } = useI18n();
  const pwa = usePwaInstall();
  const { current, shops } = useShop();
  const { signOut, profile, user } = useAuth();
  const isOwner = !!(user && current && current.owner_id === user.id);
  const canSwitchShop = isOwner && shops.length > 1;
  const [devicesOpen, setDevicesOpen] = useState(false);
  const nav = useNavigate();
  const [country, setCountryState] = useState<string>(() =>
    (typeof window !== "undefined" && localStorage.getItem("tp_country")) || "BD"
  );
  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: prof } = await supabase.from("profiles").select("country_code").eq("id", data.user.id).maybeSingle();
      if ((prof as { country_code?: string } | null)?.country_code) {
        setCountryState((prof as { country_code: string }).country_code);
      }
    });
  }, []);
  const updateCountry = async (code: string) => {
    setCountryState(code);
    try { localStorage.setItem("tp_country", code); } catch { /* ignore */ }
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase.from("profiles").update({ country_code: code }).eq("id", data.user.id);
    }
    toast.success("Country updated");
  };

  const { data: appLinks } = useQuery({
    queryKey: ["app_links", "other"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_links")
        .select("*")
        .eq("section", "other")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AppLink[];
    },
    staleTime: 60_000,
  });

  const [currency, setCurrency] = useState<string>("BDT");
  const [decimal, setDecimal] = useState<"0" | "2">("2");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCurrency(localStorage.getItem("tp_currency") || current?.currency || "BDT");
    setDecimal((localStorage.getItem("tp_decimal") as "0" | "2") || "2");
  }, [current?.currency, open]);

  const persist = (k: string, v: string) => {
    try { localStorage.setItem(k, v); } catch (err) { void err; }
  };

  const go = (to: string) => {
    onOpenChange(false);
    nav({ to: to as never });
  };

  const selectCls = "rounded-md border bg-background px-2 py-1 text-xs font-medium";
  const initials = (profile?.full_name || current?.name || "U")
    .split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 bg-muted/30 p-0 sm:max-w-md">
        <SheetHeader className="flex-none border-b bg-background px-4 py-3">
          <SheetTitle className="text-left text-lg">{t("p7_Settings")}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Profile Hero */}
          <div className="relative mb-4 overflow-hidden rounded-3xl border bg-background p-4">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
            />
            <button
              type="button"
              onClick={() => go("/app/profile")}
              className="relative flex w-full items-center gap-3 text-left"
            >
              <div className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-primary text-base font-extrabold text-primary-foreground shadow-md">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold">
                  {profile?.full_name || (t("p7_User"))}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {profile?.phone || (t("p7_View_profile"))}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <div className={"relative mt-3 grid gap-2 " + (canSwitchShop ? "grid-cols-2" : "grid-cols-1")}>
              {canSwitchShop && (
                <button
                  onClick={() => go("/app/shops")}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98]"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  {t("p7_Switch_Shop")}
                </button>
              )}
              <button
                onClick={() => go("/app/shop-settings")}
                className="flex items-center justify-center gap-1.5 rounded-xl border bg-background/70 backdrop-blur px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition active:scale-[0.98]"
                title={current?.name}
              >
                <Store className="h-3.5 w-3.5" />
                <span className="max-w-[8rem] truncate">{current?.name || (t("p7_Shop_2"))}</span>
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-4 grid grid-cols-4 gap-2">
            <QuickTile
              tint="border-primary/30 bg-card"
              icon={<LayoutDashboard className="h-4 w-4 text-primary" />}
              label={t("p7_Report")}
              onClick={() => go("/app/combined-report")}
            />
            <QuickTile
              tint="border-amber-500/40 bg-card"
              icon={<Crown className="h-4 w-4 text-amber-600" />}
              label={t("p7_Subscribe")}
              onClick={() => go("/app/subscribe")}
            />
            <QuickTile
              tint="border-emerald-500/40 bg-card"
              icon={<GraduationCap className="h-4 w-4 text-emerald-600" />}
              label={t("p7_Training")}
              onClick={() => go("/app/training")}
            />
            <QuickTile
              tint="border-sky-500/40 bg-card"
              icon={<BarChart3 className="h-4 w-4 text-sky-600" />}
              label={t("p7_Usage")}
              onClick={() => go("/app/reports")}
            />
          </div>

          {/* Preferences */}
          <SettingsGroup title={t("p7_Preferences")}>
            <SettingsRow
              iconTint="bg-blue-500/10 text-blue-600"
              icon={<Languages className="h-4 w-4" />}
              label={t("p7_Language")}
              right={
                <select
                  className={selectCls}
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Lang)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {LANG_NAMES.map((l) => (
                    <option key={l.code} value={l.code}>{l.native}</option>
                  ))}
                </select>
              }
            />
            <SettingsRow
              iconTint="bg-violet-500/10 text-violet-600"
              icon={<Globe className="h-4 w-4" />}
              label={t("p7_Country")}
              right={
                <select
                  className={selectCls}
                  value={country}
                  onChange={(e) => updateCountry(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              }
            />
            <SettingsRow
              iconTint="bg-emerald-500/10 text-emerald-600"
              icon={<Coins className="h-4 w-4" />}
              label={t("p7_Currency")}
              right={
                <select
                  className={selectCls}
                  value={currency}
                  onChange={(e) => { setCurrency(e.target.value); persist("tp_currency", e.target.value); }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {["BDT","USD","INR","PKR","AED","SAR","EUR","GBP","MYR","SGD","CNY","JPY"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              }
            />
            <SettingsRow
              iconTint="bg-slate-500/10 text-slate-600"
              icon={<Hash className="h-4 w-4" />}
              label={t("p7_Decimals")}
              right={
                <select
                  className={selectCls}
                  value={decimal}
                  onChange={(e) => {
                    const v = e.target.value as "0" | "2";
                    setDecimal(v);
                    persist("tp_decimal", v);
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="0">0</option>
                  <option value="2">2</option>
                </select>
              }
            />
            <div className="px-3 py-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Sun className="h-4 w-4" />
                </span>
                {t("p7_App_Color")}
              </div>
              <ColorThemeInline />
            </div>
          </SettingsGroup>

          {/* Shop & Data */}
          <SettingsGroup title={t("p7_Shop_Data")}>
            <SettingsRow
              iconTint="bg-rose-500/10 text-rose-600"
              icon={<Store className="h-4 w-4" />}
              label={t("p7_Shop_Settings_Backup")}
              onClick={() => go("/app/shop-settings")}
            />
            <SettingsRow
              iconTint="bg-indigo-500/10 text-indigo-600"
              icon={<UserIcon className="h-4 w-4" />}
              label={t("p7_My_Profile")}
              onClick={() => go("/app/profile")}
            />
          </SettingsGroup>

          {/* Device */}
          <SettingsGroup title={t("p7_Device")}>
            <SettingsRow
              iconTint="bg-teal-500/10 text-teal-600"
              icon={<Smartphone className="h-4 w-4" />}
              label={
                pwa.installed
                  ? (t("p7_App_Installed"))
                  : (t("p7_Install_Mobile_App"))
              }
              onClick={async () => {
                if (pwa.installed) {
                  toast.info(t("p7_App_is_already_installed"));
                  return;
                }
                if (pwa.canInstall) {
                  const outcome = await pwa.promptInstall();
                  if (outcome === "accepted") {
                    toast.success(t("p7_Installing_app"));
                  }
                  return;
                }
                if (pwa.isIos) {
                  toast.info(
                    t("p7_In_Safari_tap_Share_Add_to_Hom"),
                    { duration: 6000 }
                  );
                  return;
                }
                toast.info(
                  t("p7_Use_your_browser_menu_Install_"),
                  { duration: 6000 }
                );
              }}
            />
            <SettingsRow
              iconTint="bg-fuchsia-500/10 text-fuchsia-600"
              icon={<Smartphone className="h-4 w-4" />}
              label={t("p7_Logged_in_devices")}
              onClick={() => setDevicesOpen(true)}
            />
          </SettingsGroup>

          {/* Help & Links */}
          {(appLinks ?? []).length > 0 && (
            <SettingsGroup title={t("p7_Help_Links")}>
              {(appLinks ?? []).slice(0, 3).map((link) => {
                const Icon = ICON_MAP[link.icon] ?? LinkIcon;
                return (
                  <SettingsRow
                    key={link.key}
                    iconTint="bg-muted text-foreground/70"
                    icon={<Icon className="h-4 w-4" />}
                    label={lang === "bn" ? link.label_bn : link.label_en}
                    onClick={() => {
                      if (link.link_type === "internal") {
                        go(link.url);
                      } else {
                        onOpenChange(false);
                        window.open(link.url, "_blank");
                      }
                    }}
                  />
                );
              })}
              {(appLinks ?? []).length > 3 && (
                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-accent/40">
                    <span>{t("p7_Show_more")}</span>
                    <ChevronRight className="h-4 w-4 transition group-open:rotate-90" />
                  </summary>
                  <div className="divide-y divide-border/60 border-t">
                    {(appLinks ?? []).slice(3).map((link) => {
                      const Icon = ICON_MAP[link.icon] ?? LinkIcon;
                      return (
                        <SettingsRow
                          key={link.key}
                          iconTint="bg-muted text-foreground/70"
                          icon={<Icon className="h-4 w-4" />}
                          label={lang === "bn" ? link.label_bn : link.label_en}
                          onClick={() => {
                            if (link.link_type === "internal") {
                              go(link.url);
                            } else {
                              onOpenChange(false);
                              window.open(link.url, "_blank");
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                </details>
              )}
            </SettingsGroup>
          )}

          <p className="mt-2 text-center text-[10px] text-muted-foreground/70">
            {t("p7_Tally_Your_business_companion")}
          </p>
        </div>

        <div className="flex-none border-t bg-background p-3">
          <Button
            variant="outline"
            onClick={() => signOut().then(() => { onOpenChange(false); nav({ to: "/" }); })}
            className="h-11 w-full border-rose-200 font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t("p7_Log_out_2")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
    <ActiveDevicesDialog open={devicesOpen} onOpenChange={setDevicesOpen} />
    </>
  );
}