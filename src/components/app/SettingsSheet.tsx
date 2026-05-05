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
  right?: React.ReactNode;
  onClick?: () => void;
};

function Row({ icon, label, right, onClick }: RowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg border bg-card px-3 py-2.5 text-sm transition hover:bg-accent"
    >
      <span className="flex items-center gap-2.5 text-foreground">
        <span className="flex h-7 w-7 items-center justify-center text-muted-foreground">{icon}</span>
        {label}
      </span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {right ?? <ChevronRight className="h-4 w-4" />}
      </span>
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      <span>{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function SettingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { lang, setLang } = useI18n();
  const pwa = usePwaInstall();
  const { current } = useShop();
  const { signOut, profile } = useAuth();
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
  const CountryRow = () => (
    <Row
      icon={<Globe className="h-4 w-4" />}
      label={lang === "bn" ? "দেশ" : "Country"}
      right={
        <select
          className="rounded border bg-background px-2 py-1 text-xs"
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
  );

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

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="flex-none border-b px-4 py-3">
          <SheetTitle className="text-left text-lg">{lang === "bn" ? "সেটিংস" : "Settings"}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {/* Profile header */}
          {(profile?.full_name || profile?.phone) && (
            <button
              type="button"
              onClick={() => go("/app/profile")}
              className="mb-3 flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition hover:bg-accent"
            >
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {(profile?.full_name || current?.name || "U")
                  .split(" ")
                  .map((s) => s[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{profile?.full_name || (lang === "bn" ? "ব্যবহারকারী" : "User")}</div>
                {profile?.phone && (
                  <div className="truncate text-xs text-muted-foreground">{profile.phone}</div>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          <button
            onClick={() => go("/app/shops")}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            <ArrowLeftRight className="h-4 w-4" />
            {lang === "bn" ? "দোকান পরিবর্তন করুন" : "Switch Shop"}
          </button>

          <SectionLabel>{lang === "bn" ? "অ্যাপ সেটিংস" : "App Settings"}</SectionLabel>
          <div className="space-y-2">
            <Row
              icon={<LayoutDashboard className="h-4 w-4" />}
              label={lang === "bn" ? "কম্বাইন্ড রিপোর্ট" : "Combined Report"}
              onClick={() => go("/app/combined-report")}
            />
            <Row
              icon={<UserIcon className="h-4 w-4" />}
              label={lang === "bn" ? "আমার প্রোফাইল" : "My Profile"}
              onClick={() => go("/app/profile")}
            />
            <Row
              icon={<Store className="h-4 w-4" />}
              label={lang === "bn" ? "দোকানের সেটিংস ও ব্যাকআপ" : "Shop Settings & Backup"}
              onClick={() => go("/app/shop-settings")}
            />
            <Row
              icon={<Crown className="h-4 w-4" />}
              label={lang === "bn" ? "সাবস্ক্রিপশন" : "Subscription"}
              onClick={() => go("/app/subscribe")}
            />
            <Row
              icon={<Languages className="h-4 w-4" />}
              label={lang === "bn" ? "ভাষা" : "Language"}
              right={
                <select
                  className="rounded border bg-background px-2 py-1 text-xs"
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
            <CountryRow />
            <Row
              icon={<Coins className="h-4 w-4" />}
              label={lang === "bn" ? "কারেন্সি" : "Currency"}
              right={
                <select
                  className="rounded border bg-background px-2 py-1 text-xs"
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
            <Row
              icon={<Sun className="h-4 w-4" />}
              label={lang === "bn" ? "থিম" : "Theme"}
              right={
                null
              }
            />
            <div className="rounded-lg border bg-card p-3">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">
                {lang === "bn" ? "অ্যাপের রং" : "App Color"}
              </div>
              <ColorThemeInline />
            </div>
            <Row
              icon={<Hash className="h-4 w-4" />}
              label={lang === "bn" ? "দশমিক পয়েন্ট" : "Decimal Points"}
              right={
                <select
                  className="rounded border bg-background px-2 py-1 text-xs"
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
            <Row
              icon={<BarChart3 className="h-4 w-4" />}
              label={lang === "bn" ? "লিমিট চার্ট ও ব্যবহার" : "Usage & Limits"}
              onClick={() => go("/app/reports")}
            />
            <Row
              icon={<Smartphone className="h-4 w-4" />}
              label={
                pwa.installed
                  ? (lang === "bn" ? "অ্যাপ ইনস্টল করা আছে" : "App Installed")
                  : (lang === "bn" ? "মোবাইলে অ্যাপ ইনস্টল করুন" : "Install Mobile App")
              }
              onClick={async () => {
                if (pwa.installed) {
                  toast.info(lang === "bn" ? "অ্যাপ ইতিমধ্যে ইনস্টল করা আছে" : "App is already installed");
                  return;
                }
                if (pwa.canInstall) {
                  const outcome = await pwa.promptInstall();
                  if (outcome === "accepted") {
                    toast.success(lang === "bn" ? "অ্যাপ ইনস্টল হচ্ছে…" : "Installing app…");
                  }
                  return;
                }
                if (pwa.isIos) {
                  toast.info(
                    lang === "bn"
                      ? "Safari-তে Share বাটনে ট্যাপ করুন → 'Add to Home Screen'"
                      : "In Safari, tap Share → 'Add to Home Screen'",
                    { duration: 6000 }
                  );
                  return;
                }
                toast.info(
                  lang === "bn"
                    ? "ব্রাউজার মেনু থেকে 'Install app' / 'Add to Home screen' সিলেক্ট করুন"
                    : "Use your browser menu → 'Install app' / 'Add to Home screen'",
                  { duration: 6000 }
                );
              }}
            />
            <Row
              icon={<GraduationCap className="h-4 w-4" />}
              label={lang === "bn" ? "অ্যাপ ট্রেনিং" : "App Training"}
              onClick={() => go("/app/training")}
            />
            <Row
              icon={<Smartphone className="h-4 w-4" />}
              label={lang === "bn" ? "লগইন device সমূহ ও লগআউট" : "Logged-in devices & sign out"}
              onClick={() => setDevicesOpen(true)}
            />
          </div>

          <SectionLabel>{lang === "bn" ? "অন্যান্য" : "Other"}</SectionLabel>
          <div className="space-y-2">
            {(appLinks ?? []).map((link) => {
              const Icon = ICON_MAP[link.icon] ?? LinkIcon;
              return (
                <Row
                  key={link.key}
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
        </div>

        <div className="flex-none border-t bg-background p-3">
          <Button
            onClick={() => signOut().then(() => { onOpenChange(false); nav({ to: "/" }); })}
            className="h-11 w-full bg-rose-500 font-bold text-white hover:bg-rose-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {lang === "bn" ? "লগআউট করুন" : "Log out"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
    <ActiveDevicesDialog open={devicesOpen} onOpenChange={setDevicesOpen} />
    </>
  );
}