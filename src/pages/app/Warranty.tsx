import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, RefreshCw, ShieldCheck, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/shop";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";



type Row = {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  sale_price: number;
  warranty_end_date: string | null;
  image_url: string | null;
};

function daysBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

function WarrantyPage() {
  const { lang } = useI18n();
  const { current } = useShop();
  const [q, setQ] = useState("");
  const [perPage, setPerPage] = useState("10");

  const { data = [], isFetching, refetch, error } = useQuery({
    queryKey: ["products", "warranty", current?.id],
    enabled: !!current?.id,
    staleTime: 30_000,
    queryFn: async (): Promise<Row[]> => {
      if (!current?.id) return [];
      // warranty_end_date column may not yet exist in DB; gracefully handle.
      const { data, error } = await (supabase
        .from("products") as unknown as {
          select: (cols: string) => {
            eq: (a: string, b: string) => {
              is: (a: string, b: null) => {
                not: (a: string, b: string, c: null) => {
                  order: (a: string, opts: { ascending: boolean }) => Promise<{ data: Row[] | null; error: { message: string } | null }>;
                };
              };
            };
          };
        })
        .select("id,name,sku,stock,sale_price,warranty_end_date,image_url")
        .eq("shop_id", current.id)
        .is("deleted_at", null)
        .not("warranty_end_date", "is", null)
        .order("warranty_end_date", { ascending: true });
      if (error) {
        // Column missing — return empty list, surface info banner instead.
        if (error.message?.toLowerCase().includes("warranty_end_date")) return [];
        throw error;
      }
      return (data ?? []) as Row[];
    },
    retry: false,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const limit = Number(perPage) || 10;
    return data
      .filter(
        (r) =>
          !ql ||
          r.name.toLowerCase().includes(ql) ||
          (r.sku ?? "").toLowerCase().includes(ql),
      )
      .slice(0, limit);
  }, [data, q, perPage]);

  const columnMissing = !!error && String((error as Error).message).toLowerCase().includes("warranty");

  return (
    <div className="min-h-full bg-muted/30">
      <PageHeader
        breadcrumb={lang === "bn" ? "ওয়ারেন্টি পণ্য" : "Warranty Product"}
        title={lang === "bn" ? "ওয়ারেন্টি পণ্য" : "Warranty Product"}
      />

      <div className="container px-3 py-4 sm:px-4">
        {columnMissing && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <Info className="mt-0.5 h-4 w-4 flex-none" />
            <div>
              {lang === "bn"
                ? "ওয়ারেন্টি ফিচারের জন্য database column যোগ করা দরকার। নিচে product list খালি দেখাবে যতক্ষণ না migration apply করা হয়।"
                : "A database column is needed to enable warranty tracking. The list will stay empty until the migration is applied."}
            </div>
          </div>
        )}

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
          <Select value={perPage} onValueChange={setPerPage}>
            <SelectTrigger className="h-10 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["10", "25", "50", "100"].map((v) => (
                <SelectItem key={v} value={v}>
                  {v} {lang === "bn" ? "প্রতি পেজ" : "per page"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-10" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={"h-4 w-4 " + (isFetching ? "animate-spin" : "")} />
            <span className="ml-1 text-xs">{lang === "bn" ? "রিফ্রেশ" : "Refresh"}</span>
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border bg-background">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-6 w-6" />}
              title={lang === "bn" ? "ওয়ারেন্টি সহ কোনো পণ্য নেই" : "No products with warranty"}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">#</th>
                    <th className="px-3 py-2 text-left font-semibold">{lang === "bn" ? "নাম" : "Name"}</th>
                    <th className="px-3 py-2 text-right font-semibold">{lang === "bn" ? "মজুদ" : "Items"}</th>
                    <th className="px-3 py-2 text-left font-semibold">{lang === "bn" ? "ওয়ারেন্টি শেষ" : "Warranty End Date"}</th>
                    <th className="px-3 py-2 text-right font-semibold">{lang === "bn" ? "মূল্য" : "Price"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const d = new Date(r.warranty_end_date!);
                    const diff = daysBetween(d, today);
                    const expired = diff < 0;
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
                              (expired
                                ? "bg-rose-100 text-rose-700"
                                : diff <= 30
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700")
                            }
                          >
                            {d.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB")}
                            <span className="opacity-70">
                              ({expired ? `${Math.abs(diff)}d ago` : `${diff}d left`})
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

export default WarrantyPage;
