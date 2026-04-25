import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Banner = {
  id: string;
  image_url: string;
  title_bn: string | null;
  title_en: string | null;
  link_url: string | null;
};

export function DashboardBannerCarousel() {
  const { lang } = useI18n();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [selected, setSelected] = useState(0);

  const { data: banners } = useQuery({
    queryKey: ["dashboard_banners", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_banners")
        .select("id,image_url,title_bn,title_en,link_url,sort_order,is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Banner[];
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!emblaApi) return;
    const onSel = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSel);
    onSel();
    const id = setInterval(() => {
      if (emblaApi.canScrollNext()) emblaApi.scrollNext();
      else emblaApi.scrollTo(0);
    }, 4500);
    return () => {
      clearInterval(id);
      emblaApi.off("select", onSel);
    };
  }, [emblaApi, banners?.length]);

  if (!banners || banners.length === 0) return null;

  const open = (b: Banner) => {
    if (!b.link_url) return;
    if (b.link_url.startsWith("/")) window.location.href = b.link_url;
    else window.open(b.link_url, "_blank");
  };

  return (
    <div className="mt-4">
      <div ref={emblaRef} className="overflow-hidden rounded-xl">
        <div className="flex">
          {banners.map((b) => {
            const title = lang === "bn" ? b.title_bn : b.title_en;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => open(b)}
                className="relative min-w-0 flex-[0_0_100%] cursor-pointer"
              >
                <img
                  src={b.image_url}
                  alt={title ?? ""}
                  className="h-[110px] w-full object-cover md:h-[160px]"
                  loading="lazy"
                />
                {title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-left text-xs font-semibold text-white md:text-sm">
                    {title}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {banners.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Go to banner ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === selected ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/40",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}