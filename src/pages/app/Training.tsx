import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/app/EmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { icons } from "@/lib/icons";
import { Play, Search, GraduationCap } from "lucide-react";

type Video = {
  id: string;
  title_bn: string;
  title_en: string;
  youtube_id: string;
  category: string;
  description: string | null;
  sort_order: number;
};

const CATEGORY_LABELS: Record<string, { bn: string; en: string }> = {
  general: { bn: "সাধারণ", en: "General" },
  sell: { bn: "বিক্রি", en: "Sell" },
  purchase: { bn: "কেনা", en: "Purchase" },
  stock: { bn: "স্টক", en: "Stock" },
  expense: { bn: "খরচ", en: "Expense" },
  contacts: { bn: "যোগাযোগ", en: "Contacts" },
  online_shop: { bn: "অনলাইন শপ", en: "Online Shop" },
  report: { bn: "রিপোর্ট", en: "Reports" },
};



function TrainingPage() {
  const { lang } = useI18n();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [playing, setPlaying] = useState<Video | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("training_videos")
        .select("*")
        .eq("is_published", true)
        .order("category")
        .order("sort_order");
      setVideos((data as Video[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const cats = useMemo(() => {
    const set = new Set(videos.map((v) => v.category));
    return Array.from(set);
  }, [videos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return videos.filter((v) => {
      if (activeCat !== "all" && v.category !== activeCat) return false;
      if (!q) return true;
      return (
        v.title_bn.toLowerCase().includes(q) ||
        v.title_en.toLowerCase().includes(q) ||
        (v.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [videos, search, activeCat]);

  return (
    <div className="container px-4 py-4">
      <div className="flex items-center gap-2">
        <img src={icons.training} alt="" className="h-7 w-7" />
        <h1 className="text-xl font-extrabold md:text-2xl">
          {lang === "bn" ? "অ্যাপ ট্রেনিং" : "App Training"}
        </h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {lang === "bn"
          ? "প্রত্যেকটা ফিচার শিখতে নিচের ভিডিওগুলো দেখুন"
          : "Watch these videos to learn every feature."}
      </p>

      {/* Search + filter */}
      <div className="mt-4 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "bn" ? "ভিডিও খুঁজুন" : "Search videos"}
            className="h-10 pl-8"
          />
        </div>
      </div>

      {cats.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCat("all")}
            className={
              "rounded-full border px-3 py-1 text-xs font-semibold transition " +
              (activeCat === "all" ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")
            }
          >
            {lang === "bn" ? "সবগুলো" : "All"}
          </button>
          {cats.map((c) => {
            const l = CATEGORY_LABELS[c] ?? { bn: c, en: c };
            return (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={
                  "rounded-full border px-3 py-1 text-xs font-semibold transition " +
                  (activeCat === c ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")
                }
              >
                {lang === "bn" ? l.bn : l.en}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border bg-card">
          <EmptyState
            icon={<GraduationCap className="h-6 w-6" />}
            title={lang === "bn" ? "এখনো কোনো ট্রেনিং ভিডিও নেই — শীঘ্রই আসছে" : "No training videos yet — coming soon"}
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => {
            const title = lang === "bn" ? (v.title_bn || v.title_en) : (v.title_en || v.title_bn);
            return (
              <Card
                key={v.id}
                className="cursor-pointer overflow-hidden transition hover:shadow-md"
                onClick={() => setPlaying(v)}
              >
                <div className="relative aspect-video bg-muted">
                  <img
                    src={`https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`}
                    alt={title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
                  </div>
                  <Button
                    size="icon"
                    className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-600 hover:bg-rose-700"
                  >
                    <Play className="h-5 w-5 fill-current" />
                  </Button>
                </div>
                <CardContent className="p-3">
                  <div className="font-semibold leading-tight">{title}</div>
                  {v.description && (
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{v.description}</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!playing} onOpenChange={(v) => !v && setPlaying(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="pr-8">
              {playing && (lang === "bn" ? (playing.title_bn || playing.title_en) : (playing.title_en || playing.title_bn))}
            </DialogTitle>
          </DialogHeader>
          {playing && (
            <div className="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${playing.youtube_id}?autoplay=1&rel=0`}
                title={playing.title_bn || playing.title_en}
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          )}
          {playing?.description && (
            <div className="px-4 pb-4 text-sm text-muted-foreground">{playing.description}</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TrainingPage;
