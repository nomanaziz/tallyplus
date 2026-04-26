import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, RefreshCw, AlertTriangle, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";

({
  head: () => ({ meta: [{ title: "মেয়াদোত্তীর্ণ পণ্য — Hishabee" }] }),
  component: ExpiringPage,
});

type Tab = "soon" | "expired";

type Row = {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  sale_price: number;
  cost_price: number;
  expiry_date: string | null;
  image_url: string | null;
};

function daysBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

function ExpiringPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const [tab, setTab] = useState<Tab>("soon");
  const [q, setQ] = useState("");

  const { data = [], isFetching, refetch } = useQuery({
    queryKey: ["products", "expiring", current?.id],
    enabled: !!current?.id,
    staleTime: 30_000,
    queryFn: async (): Promise<Row[]> => {
      if (!current?.id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id,name,sku,stock,sale_price,cost_price,expiry_date,image_url")
        .eq("shop_id", current.id)
        .is("deleted_at", null)
        .not("expiry_date", "is", null)
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return data
      .filter((r) => {
        if (!r.expiry_date) return false;
        const d = new Date(r.expiry_date);
        const diff = daysBetween(d, today);
        if (tab === "expired") return diff < 0;
        return diff >= 0 && diff <= 30;
      })
      .filter(
        (r) =>
          !ql ||
          r.name.toLowerCase().includes(ql) ||
          (r.sku ?? "").toLowerCase().includes(ql),
      );
  }, [data, tab, q, today]);

  return (
    <div className="min-h-full bg-muted/30">
      <PageHeader
        breadcrumb={lang === "bn" ? "মেয়াদোত্তীর্ণ পণ্য" : "Expired Product"}
        title={lang === "bn" ? "মেয়াদোত্তীর্ণ পণ্য" : "Expired Product"}
      />

      <div className="container px-3 py-4 sm:px-4">
        <div className="mb-3 inline-flex rounded-lg border bg-background p-1 text-sm">
          <button
            onClick={() => setTab("soon")}
            className={
              "rounded-md px-4 py-1.5 font-semibold transition " +
              (tab === "soon" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent")
            }
          >
            {lang === "bn" ? "শীঘ্রই মেয়াদোত্তীর্ণ" : "Expired soon"}
          </button>
          <button
            onClick={() => setTab("expired")}
            className={
              "rounded-md px-4 py-1.5 font-semibold transition " +
              (tab === "expired" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent")
            }
          >
            {lang === "bn" ? "মেয়াদোত্তীর্ণ" : "Expired"}
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={lang === "bn" ? "বারকোড বা নাম দিয়ে খুঁজুন" : "Search by barcode or Product Name"}
              className="h-10 pl-9"
            />
          </div>
          <Button variant="outline" size="sm" className="h-10" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={"h-4 w-4 " + (isFetching ? "animate-spin" : "")} />
            <span className="ml-1 text-xs">{lang === "bn" ? "রিফ্রেশ" : "Refresh"}</span>
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border bg-background">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="h-6 w-6" />}
              title={
                tab === "expired"
                  ? lang === "bn"
                    ? "মেয়াদোত্তীর্ণ কোনো পণ্য নেই"
                    : "No expired products"
                  : lang === "bn"
                    ? "শীঘ্রই মেয়াদোত্তীর্ণ হবে এমন কোনো পণ্য নেই"
                    : "No products expiring soon"
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">#</th>
                    <th className="px-3 py-2 text-left font-semibold">{lang === "bn" ? "নাম" : "Name"}</th>
                    <th className="px-3 py-2 text-right font-semibold">{lang === "bn" ? "মজুদ" : "Items"}</th>
                    <th className="px-3 py-2 text-left font-semibold">{lang === "bn" ? "মেয়াদ শেষ" : "Expiry Date"}</th>
                    <th className="px-3 py-2 text-right font-semibold">{lang === "bn" ? "মূল্য" : "Price"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const d = new Date(r.expiry_date!);
                    const diff = daysBetween(d, today);
                    const isExpired = diff < 0;
                    return (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {r.image_url ? (
                              <img src={r.image_url} alt="" className="h-8 w-8 rounded object-cover" />
                            ) : (
                              <div className="h-8 w-8 rounded bg-muted" />
                            )}
                            <div className="min-w-0">
                              <div className="truncate font-medium">{r.name}</div>
                              {r.sku && <div className="truncate text-xs text-muted-foreground">{r.sku}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{Number(r.stock || 0)}</td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium " +
                              (isExpired
                                ? "bg-rose-100 text-rose-700"
                                : diff <= 7
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700")
                            }
                          >
                            {isExpired && <AlertTriangle className="h-3 w-3" />}
                            {d.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB")}
                            <span className="opacity-70">
                              ({isExpired ? `${Math.abs(diff)}d ago` : `${diff}d`})
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">
                          {fmtMoney(Number(r.sale_price || 0), lang)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExpiringPage;
