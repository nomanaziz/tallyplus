import { useNavigate, useParams } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, fmtMoney } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { PageHeader } from "@/components/app/PageHeader";
import { RequirePerm } from "@/components/app/RequirePerm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { printTableReport } from "@/lib/print-report";



function ReturnDetailsPage() {
  const { lang, t } = useI18n();
  const { id } = useParams();
  const nav = useNavigate();
  const { current } = useShop();

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
    r.refund_status === "refunded" ? (t("p7_Refunded"))
    : r.refund_status === "adjusted_to_due" ? (t("p7_Adjusted_to_due"))
    : (t("p7_Pending"));

  function onPrint() {
    const created = new Date(r.created_at).toISOString().slice(0, 10);
    printTableReport({
      shopName: current?.name ?? "",
      shopAddress: (current as { address?: string | null } | null)?.address ?? null,
      shopPhone: (current as { phone?: string | null } | null)?.phone ?? null,
      title: `${t("p7_Return")} ${r.return_no ?? id.slice(0, 6)}`,
      startDate: created,
      endDate: created,
      lang,
      columns: [
        { key: "name", label: t("p7_Item") },
        { key: "qty", label: t("p7_Qty"), align: "right" },
        { key: "price", label: t("p7_Price"), align: "right" },
        { key: "total", label: t("p7_Total_2"), align: "right" },
      ],
      rows: (data?.items ?? []).map((it) => ({
        name: it.name,
        qty: Number(it.qty),
        price: fmtMoney(Number(it.price), lang),
        total: fmtMoney(Number(it.total), lang),
      })),
      footer: `${t("p7_Total_2")}: ${fmtMoney(Number(r.total), lang)}  •  ${t("p7_Refunded_2")} (${r.refund_method}): ${fmtMoney(Number(r.refund_amount), lang)}  •  ${t("p7_Status")}: ${statusLabel}`,
    });
  }

  return (
    <div className="min-h-full bg-muted/30">
      <PageHeader
        breadcrumb={t("p7_Product_Return")}
        title={r.return_no ?? id.slice(0, 6)}
        actions={
          <>
            <Button variant="outline" className="h-10 gap-2" onClick={() => nav({ to: "/app/returns" })}>
              <ArrowLeft className="h-4 w-4" />
              {t("p7_Back")}
            </Button>
            <Button variant="outline" className="h-10 gap-2" onClick={onPrint}>
              <Printer className="h-4 w-4" />
              {t("p7_Print")}
            </Button>
          </>
        }
      />
      <div className="container space-y-3 px-3 py-3 md:space-y-4 md:px-4 md:py-4">
        <div className="rounded-xl border bg-background p-4">
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Field label={t("p7_Date")} value={new Date(r.created_at).toLocaleString("en-GB")} />
            <Field label={t("p7_Customer")} value={data.customer?.name ?? (t("p7_Walk_in"))} />
            <Field label={t("p7_Reason_2")} value={r.reason ?? "—"} />
            <Field label={t("p7_Status")} value={statusLabel} />
          </div>
          {r.reason_note && <p className="mt-2 rounded bg-muted/40 p-2 text-xs">{r.reason_note}</p>}
        </div>

        <div className="rounded-xl border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs">
              <tr>
                <th className="p-2 text-left">{t("p7_Item")}</th>
                <th className="p-2 text-right">{t("p7_Qty")}</th>
                <th className="p-2 text-right">{t("p7_Price")}</th>
                <th className="p-2 text-right">{t("p7_Total_2")}</th>
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
                <td className="p-2 font-bold" colSpan={3}>{t("p7_Total")}</td>
                <td className="p-2 text-right font-extrabold">{fmtMoney(Number(r.total), lang)}</td>
              </tr>
              <tr>
                <td className="p-2 font-bold text-rose-600" colSpan={3}>{t("p7_Refunded")} ({r.refund_method})</td>
                <td className="p-2 text-right font-extrabold text-rose-600">{fmtMoney(Number(r.refund_amount), lang)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {r.note && (
          <div className="rounded-xl border bg-background p-3 text-sm">
            <div className="text-[11px] font-bold text-muted-foreground">{t("p7_Note")}</div>
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
export default ReturnDetailsPage;
