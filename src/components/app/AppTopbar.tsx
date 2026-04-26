import { useState } from "react";
import { useNavigate } from "@/lib/router";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/shop";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuickSellSheet } from "./QuickSellSheet";
import { SettingsSheet } from "./SettingsSheet";
import { InstallAppButton } from "./InstallAppPrompt";
import { ColorThemeButton } from "./ColorThemePicker";
import { NotificationBell } from "./NotificationBell";
import { Settings, MessageCircle, ChevronDown, LogOut, Languages, Zap, ArrowLeftRight, LayoutDashboard } from "lucide-react";

export function AppTopbar() {
  const { profile, signOut } = useAuth();
  const { current } = useShop();
  const { lang, setLang } = useI18n();
  const nav = useNavigate();
  const [quickOpen, setQuickOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const initials = (profile?.full_name || current?.name || "FS")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-14 flex-none items-center justify-between border-b bg-background/90 px-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="text-sm font-extrabold tracking-tight md:hidden">
          {current?.name ?? (lang === "bn" ? "Tally Plus" : "Tally Plus")}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          onClick={() => setQuickOpen(true)}
          size="sm"
          className="h-9 gap-1.5 bg-emerald-600 px-3 font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          <Zap className="h-4 w-4" />
          <span className="hidden sm:inline">{lang === "bn" ? "দ্রুত বেচা" : "Quick Sell"}</span>
        </Button>
        <a
          href="https://wa.me/8801841577944"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
          aria-label="WhatsApp"
        >
          <MessageCircle className="h-5 w-5" />
        </a>
        <NotificationBell />
        <ColorThemeButton />
        <InstallAppButton />
        <button
          onClick={() => setLang(lang === "bn" ? "en" : "bn")}
          className="hidden h-9 items-center gap-1 rounded-full px-2 text-xs font-semibold text-muted-foreground hover:bg-accent md:inline-flex"
        >
          <Languages className="h-4 w-4" />
          {lang === "bn" ? "EN" : "বাং"}
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-muted-foreground hover:bg-accent"
        >
          <Settings className="h-4 w-4" />
          <span className="hidden md:inline">{lang === "bn" ? "সেটিংস" : "Settings"}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-10 items-center gap-2 rounded-full px-1.5 hover:bg-accent">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {initials}
              </div>
              <span className="hidden max-w-32 truncate text-sm font-semibold md:inline">
                {current?.name ?? profile?.full_name ?? ""}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-xs">
              <div className="font-semibold">{profile?.full_name}</div>
              <div className="text-muted-foreground">{profile?.phone}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => nav({ to: "/app/shops" })}>
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              {lang === "bn" ? "দোকান পরিবর্তন" : "Switch Shop"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => nav({ to: "/app/combined-report" })}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              {lang === "bn" ? "কম্বাইন্ড রিপোর্ট" : "Combined Report"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang(lang === "bn" ? "en" : "bn")}>
              <Languages className="mr-2 h-4 w-4" />
              {lang === "bn" ? "English" : "বাংলা"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut().then(() => nav({ to: "/" }))} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {lang === "bn" ? "লগআউট" : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <QuickSellSheet open={quickOpen} onOpenChange={setQuickOpen} />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}