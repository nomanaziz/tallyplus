import { Outlet, useLocation, useNavigate } from "@/lib/router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, Menu, ChevronDown, UserRound, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "@/components/app/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";



function AdminLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const isLogin = loc.pathname === "/xbd-login" || loc.pathname === "/admin/login";
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string>("Admin");
  const [nameDlgOpen, setNameDlgOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (isLogin) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        if (!cancelled) nav({ to: "/xbd-login" });
        return;
      }
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      if (!roleRow) {
        await supabase.auth.signOut();
        toast.error("আপনার admin access নেই");
        nav({ to: "/xbd-login" });
        return;
      }
      setEmail(user.email ?? null);
      const dn =
        (user.user_metadata as Record<string, unknown> | null)?.["display_name"] ??
        (user.user_metadata as Record<string, unknown> | null)?.["full_name"];
      setDisplayName(typeof dn === "string" && dn.trim() ? dn : "Admin");
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [nav, isLogin]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    nav({ to: "/xbd-login" });
  };

  const openRename = () => {
    setNameInput(displayName);
    setNameDlgOpen(true);
  };

  const saveName = async () => {
    const v = nameInput.trim();
    if (!v) {
      toast.error("নাম খালি হতে পারবে না");
      return;
    }
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({ data: { display_name: v } });
    setSavingName(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDisplayName(v);
    setNameDlgOpen(false);
    toast.success("নাম আপডেট হয়েছে");
  };

  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Login page renders outside the chrome
  if (isLogin) return <Outlet />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:block">
        <AdminSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 flex-none items-center justify-between border-b bg-card px-4">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-60 p-0">
                <AdminSidebar onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-semibold">Admin Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-10 items-center gap-2 rounded-full px-1.5 hover:bg-accent">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {initials || <UserRound className="h-4 w-4" />}
                  </div>
                  <span className="hidden max-w-32 truncate text-sm font-semibold md:inline">
                    {displayName}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <div className="px-2 py-1.5 text-xs">
                  <div className="font-semibold">{displayName}</div>
                  <div className="truncate text-muted-foreground">{email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={openRename}>
                  <Pencil className="mr-2 h-4 w-4" />
                  নাম পরিবর্তন করুন
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-muted/30">
          <Outlet />
        </main>
      </div>
      <Dialog open={nameDlgOpen} onOpenChange={setNameDlgOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Admin নাম পরিবর্তন</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="admin-display-name">নাম</Label>
            <Input
              id="admin-display-name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="আপনার নাম"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNameDlgOpen(false)} disabled={savingName}>
              বাতিল
            </Button>
            <Button onClick={saveName} disabled={savingName}>
              {savingName ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              সংরক্ষণ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default AdminLayout;
