import { useNavigate } from "@/lib/router";
import { useAuth } from "@/lib/auth";
import { useI18n, LANG_NAMES, type Lang } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ColorThemeButton } from "@/components/app/ColorThemePicker";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { ChevronDown, Languages, LogOut, Check } from "lucide-react";

export function CustomerTopbar() {
  const { profile, signOut } = useAuth();
  const { lang, setLang, t } = useI18n();
  const nav = useNavigate();

  const initials = (profile?.full_name || "ব")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const current = LANG_NAMES.find((l) => l.code === lang);

  return (
    <header className="sticky top-0 z-30 flex h-14 flex-none items-center justify-between border-b bg-background/90 px-3 backdrop-blur">
      <div className="flex items-center gap-2 md:hidden">
        <BrandWordmark className="text-sm font-extrabold tracking-tight" />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <ColorThemeButton />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-9 items-center gap-1 rounded-full px-2 text-sm font-medium text-muted-foreground hover:bg-accent"
              aria-label="Language"
            >
              <Languages className="h-4 w-4" />
              <span className="hidden sm:inline">{current?.flag} {current?.native}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs">Language</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LANG_NAMES.map((l) => (
              <DropdownMenuItem key={l.code} onClick={() => setLang(l.code as Lang)}>
                <span className="mr-2">{l.flag}</span>
                <span className="flex-1">{l.native}</span>
                {lang === l.code && <Check className="h-3.5 w-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-10 items-center gap-2 rounded-full px-1.5 hover:bg-accent">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {initials}
              </div>
              <span className="hidden max-w-32 truncate text-sm font-semibold md:inline">
                {profile?.full_name ?? ""}
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
            <DropdownMenuItem onClick={() => nav({ to: "/customer/profile" })}>
              প্রোফাইল
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => nav({ to: "/customer/subscription" })}>
              সাবস্ক্রিপশন
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut().then(() => nav({ to: "/" }))}
              className="text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" /> {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}