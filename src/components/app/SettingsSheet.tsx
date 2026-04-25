import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useI18n, type Lang } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  const { current } = useShop();
  const { signOut } = useAuth();
  const nav = useNavigate();

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
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [decimal, setDecimal] = useState<"0" | "2">("2");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCurrency(localStorage.getItem("tp_currency") || current?.currency || "BDT");
    const t = (localStorage.getItem("tp_theme") as "light" | "dark") || "light";
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="flex-none border-b px-4 py-3">
          <SheetTitle className="text-left text-lg">{lang === "bn" ? "সেটিংস" : "Settings"}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <button
            onClick={() => go("/app/shops")}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-foreground px-3 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
          >
            <ArrowLeftRight className="h-4 w-4" />
            {lang === "bn" ? "দোকান পরিবর্তন করুন" : "Switch Shop"}
          </button>

          <SectionLabel>{lang === "bn" ? "অ্যাপ সেটিংস" : "App Settings"}</SectionLabel>
          <div className="space-y-2">
            <Row
              icon={<LayoutDashboard className="h-4 w-4" />}
              label={lang === "bn" ? "কমপ্লিট ড্যাশবোর্ড" : "Complete Dashboard"}
              onClick={() => go("/app/combined-report")}
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
                  <option value="bn">বাংলা</option>
                  <option value="en">English</option>
                </select>
              }
            />
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
                  <option value="BDT">BDT ৳</option>
                  <option value="USD">USD $</option>
                  <option value="INR">INR ₹</option>
                </select>
              }
            />
            <Row
              icon={<Sun className="h-4 w-4" />}
              label={lang === "bn" ? "থিম" : "Theme"}
              right={
                <select
                  className="rounded border bg-background px-2 py-1 text-xs"
                  value={theme}
                  onChange={(e) => {
                    const v = e.target.value as "light" | "dark";
                    setTheme(v);
                    persist("tp_theme", v);
                    document.documentElement.classList.toggle("dark", v === "dark");
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              }
            />
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
              label={lang === "bn" ? "হিসাবী মোবাইল অ্যাপ" : "Mobile App"}
              onClick={() => window.open("https://play.google.com/store", "_blank")}
            />
            <Row
              icon={<GraduationCap className="h-4 w-4" />}
              label={lang === "bn" ? "অ্যাপ ট্রেনিং" : "App Training"}
              onClick={() => go("/app/training")}
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

          <div className="mt-5 text-center text-[11px] text-muted-foreground">
            <span>{lang === "bn" ? "ভার্সন" : "Version"} : {__APP_VERSION__}</span>
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5">OS: Web</span>
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
  );
}