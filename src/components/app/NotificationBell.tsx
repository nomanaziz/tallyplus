import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { Loader2 } from "lucide-react";
import { icons, AppIcon } from "@/lib/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Notif = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  type: string | null;
  is_read: boolean;
  created_at: string;
};

function timeAgoBn(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "এইমাত্র";
  if (m < 60) return `${m} মিনিট আগে`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ঘণ্টা আগে`;
  const d = Math.floor(h / 24);
  return `${d} দিন আগে`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const q = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    staleTime: 15_000,
    // Poll every 60s but pause when tab is hidden — saves bandwidth + battery
    // and avoids stale "loading…" spinner when user returns.
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Notif[]> => {
      const { data } = await supabase
        .from("notifications")
        .select("id,title,body,link,type,is_read,created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      return (data as Notif[] | null) ?? [];
    },
  });

  // Realtime: refresh on insert
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          void qc.invalidateQueries({ queryKey: ["notifications", user.id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user, qc]);

  const items = q.data ?? [];
  const unread = items.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    void qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const onClickItem = async (n: Notif) => {
    setOpen(false);
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      void qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
    }
    if (n.link) nav({ to: n.link as never });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
          aria-label="Notifications"
        >
          <AppIcon name="notification" className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">নোটিফিকেশন</span>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unread === 0}
            className="text-xs font-medium text-primary disabled:opacity-40"
          >
            সব পড়া হিসেবে মার্ক
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {q.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              এখনো কোনো নোটিফিকেশন নেই
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onClickItem(n)}
                    className={`flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-accent ${
                      !n.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <span
                      className={`mt-1.5 inline-block h-2 w-2 flex-none rounded-full ${
                        !n.is_read ? "bg-primary" : "bg-transparent"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{n.title}</div>
                      {n.body && (
                        <div className="line-clamp-2 text-xs text-muted-foreground">{n.body}</div>
                      )}
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {timeAgoBn(n.created_at)}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
