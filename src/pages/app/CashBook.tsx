import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/app/PageHeader";
import { RequirePerm } from "@/components/app/RequirePerm";
import { CashBookView, MonthSwitcher, useDefaultMonth, type MonthCursor } from "@/components/app/CashBookView";
import { loadShopCashBook } from "@/lib/cash-book-queries";
import { useShop } from "@/lib/shop";
import { useI18n } from "@/lib/i18n";

function CashBookPage() {
  const { current } = useShop();
  const { lang, t } = useI18n();
  const def = useDefaultMonth();
  const [cursor, setCursor] = useState<MonthCursor>(def);

  const { data, isFetching } = useQuery({
    queryKey: ["cash-book", current?.id, cursor.year, cursor.month0],
    queryFn: () => loadShopCashBook(current!.id, cursor.year, cursor.month0),
    enabled: !!current?.id,
    staleTime: 30_000,
  });

  return (
    <div className="min-h-full bg-muted/30">
      <PageHeader
        breadcrumb={t("p7_Reports_Cash_Book")}
        title={t("p7_Cash_Book_Monthly_Summary")}
        actions={<MonthSwitcher value={cursor} onChange={setCursor} />}
      />
      <CashBookView
        data={data ?? null}
        loading={isFetching}
        ownerName={current?.name ?? ""}
        subtitle={t("p7_Full_categorized_income_and_ex")}
      />
    </div>
  );
}

export default function GuardedCashBookPage() {
  return (
    <RequirePerm group="report">
      <CashBookPage />
    </RequirePerm>
  );
}