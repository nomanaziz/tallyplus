import { useState, lazy, Suspense } from "react";
import { useNavigate } from "@/lib/router";
import { useAuth } from "@/lib/auth";
import { useShop } from "@/lib/shop";
import { useI18n } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InstallAppButton } from "./InstallAppPrompt";
import { NotificationBell } from "./NotificationBell";
import { SyncStatusButton } from "./SyncStatusButton";
import { CalculatorPopover } from "./CalculatorPopover";
import { ChevronDown, LogOut, ArrowLeftRight, LayoutDashboard, Eye, EyeOff } from "lucide-react";
import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { icons, AppIcon } from "@/lib/icons";
import { useCostHide } from "@/lib/costHide";

const SettingsSheet = lazy(() =>
  import("./SettingsSheet").then((m) => ({ default: m.SettingsSheet }))
);

export function AppTopbar() {
  const { profile, signOut, user } = useAuth();
  const { current, shops } = useShop();
  const { t } = useI18n();
  const nav = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { hidden: costHidden, toggle: toggleCostHide } = useCostHide();
  const isOwner = !!(user && current && current.owner_id === user.id);
  const canSwitchShop = isOwner && shops.length > 1;

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
        {current?.name ? (
          <span className="text-sm font-extrabold tracking-tight md:hidden">{current.name}</span>
        ) : (
          <BrandWordmark className="text-sm font-extrabold tracking-tight md:hidden" />
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <SyncStatusButton />
        <CalculatorPopover />
        <NotificationBell />
        <InstallAppButton />
        <button
          onClick={toggleCostHide}
          aria-pressed={costHidden}
          title={costHidden ? "Show prices" : "Hide prices (Cost Hide)"}
          className={
            "flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium hover:bg-accent " +
            (costHidden ? "text-primary" : "text-muted-foreground")
          }
        >
          {costHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span className="sr-only">Cost Hide</span>
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          data-tour="profile"
          className="flex h-9 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-muted-foreground hover:bg-accent"
        >
          <AppIcon name="settings" className="h-4 w-4" />
          <span className="hidden md:inline">{t("settings")}</span>
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
            {canSwitchShop && (
              <DropdownMenuItem onClick={() => nav({ to: "/app/shops" })}>
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                {t("switchShop")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => nav({ to: "/app/combined-report" })}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              {t("combinedReport")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut().then(() => nav({ to: "/" }))} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
        </Suspense>
      )}
    </header>
  );
}