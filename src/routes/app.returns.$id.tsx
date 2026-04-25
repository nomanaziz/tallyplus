import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { RequirePerm } from "@/components/app/RequirePerm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

export const Route = createFileRoute("/app/returns/$id")({
  head: () => ({ meta: [{ title: "রিটার্ন বিস্তারিত — Tally Plus" }] }),
  component: () => (
    <RequirePerm group="returns" item="view"><ReturnDetailsPage /></RequirePerm>
  ),
});

function ReturnDetailsPage() {
  const { lang } = useI18n();
  const { id } = Route.useParams();
  const nav = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["return-details", id],
    queryFn: async () => {
      const [r, items] = await Promise.all([
        supabase.from("sale_returns").select("*").eq("id", id).maybeSingle(),
        supabase.from("sale_return_items").select("*").eq("return_id", id),
      ]);
      let customer: any = null;
      if (r.data?.customer_id) {
        const { data: c } = await supabase.from("customers").select("name,phone").eq("id", r.data.customer_id).maybeSingle();
        customer = c;
      }
      return { ret: r.data as any, items: (items.data ?? []) as any[], customer };
    },
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">…</div>;
  if (!data?.ret) return <div className="p-6 text-sm">Not found</div>;

  const r = data.ret;
  const statusLabel =
    r.refund_status === "refunded" ? (lang === "bn" ? "ফেরত দেওয়া" : "Refunded")
    : r.refund_status === "adjusted_to_due" ? (lang === "bn" ? "বাকিতে সমন্বয়" : "Adjusted to due")
    : (lang === "bn" ? "অপেক্ষমান" : "Pending");

  return (
    <div className="min-h-full bg-muted/30">
      <PageHeader
        breadcrumb={lang === "bn" ? "প্রোডাক্ট রিটার্ন" : "Product Return"}
        title={r.return_no ?? id.slice(0, 6)}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => nav({ to: "/app/returns" })}><ArrowLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /></Button>
          </>
        }
      />
      <div className="container space-y-3 px-3 py-3 md:space-y-4 md:px-4 md:py-4">
        <div className="rounded-xl border bg-background p-4">
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Field label={lang === "bn" ? "তারিখ" : "Date"} value={new Date(r.created_at).toLocaleString("en-GB")} />
            <Field label={lang === "bn" ? "কাস্টমার" : "Customer"} value={data.customer?.name ?? (lang === "bn" ? "ওয়াক-ইন" : "Walk-in")} />
            <Field label={lang === "bn" ? "কারণ" : "Reason"} value={r.reason ?? "—"} />
            <Field label={lang === "bn" ? "অবস্থা" : "Status"} value={statusLabel} />
          </div>
          {r.reason_note && <p className="mt-2 rounded bg-muted/40 p-2 text-xs">{r.reason_note}</p>}
        </div>

        <div className="rounded-xl border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs">
              <tr>
                <th className="p-2 text-left">{lang === "bn" ? "পণ্য" : "Item"}</th>
                <th className="p-2 text-right">{lang === "bn" ? "পরিমাণ" : "Qty"}</th>
                <th className="p-2 text-right">{lang === "bn" ? "মূল্য" : "Price"}</th>
                <th className="p-2 text-right">{lang === "bn" ? "মোট" : "Total"}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="p-2">{it.name}</td>
                  <td className="p-2 text-right">{Number(it.qty)}</td>
                  <td className="p-2 text-right">{fmtMoney(Number(it.price), lang)}</td>
                  <td className="p-2 text-right font-semibold">{fmtMoney(Number(it.total), lang)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/20">
                <td className="p-2 font-bold" colSpan={3}>{lang === "bn" ? "মোট রিটার্ন মূল্য" : "Total"}</td>
                <td className="p-2 text-right font-extrabold">{fmtMoney(Number(r.total), lang)}</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-rose-600" colSpan={3}>{lang === "bn" ? "ফেরত দেওয়া" : "Refunded"} ({r.refund_method})</td>
                <td className="p-2 text-right font-extrabold text-rose-600">{fmtMoney(Number(r.refund_amount), lang)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {r.note && (
          <div className="rounded-xl border bg-background p-3 text-sm">
            <div className="text-[11px] font-bold text-muted-foreground">{lang === "bn" ? "নোট" : "Note"}</div>
            <p className="mt-1">{r.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-semibold">{value}</div>
    </div>
  );
}