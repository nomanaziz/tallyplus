import { useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Heart, Loader2, Store, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Row = {
  id: string;
  shop_id: string;
  created_at: string;
  shops: { id: string; name: string; slug: string | null; username: string | null; logo_url: string | null; tagline: string | null; address: string | null } | null;
};

export default function FavoriteShopsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void (async () => {
      const { data } = await supabase
        .from("consumer_favourite_shops")
        .select("id, shop_id, created_at, shops(id, name, slug, username, logo_url, tagline, address)")
        .eq("consumer_id", user.id)
        .order("created_at", { ascending: false });
      if (!alive) return;
      setRows((data as unknown as Row[] | null) ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("consumer_favourite_shops").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.filter((r) => r.id !== id));
    toast.success("সরানো হয়েছে");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
        <h1 className="text-xl font-bold">প্রিয় দোকান</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">এখনো কোনো প্রিয় দোকান যোগ করেননি।</p>
          <p className="mt-1 text-xs text-muted-foreground">দোকানের পেজে গিয়ে ❤️ চাপুন।</p>
          <Button asChild className="mt-3"><Link to="/shop">মার্কেটপ্লেসে যান</Link></Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => {
            const s = r.shops;
            if (!s) return null;
            const slug = s.slug ?? s.username;
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
                <Link
                  to={slug ? "/shop/s/$slug" : "/shop"}
                  params={slug ? { slug } : undefined}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  {s.logo_url ? (
                    <img src={s.logo_url} alt={s.name} className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                      <Store className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{s.name}</div>
                    {s.tagline && <div className="truncate text-xs text-muted-foreground">{s.tagline}</div>}
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(r.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="সরান"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
