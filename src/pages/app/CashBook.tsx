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
  const { lang } = useI18n();
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
        breadcrumb={lang === "bn" ? "রিপোর্ট › ক্যাশবুক" : "Reports › Cash Book"}
        title={lang === "bn" ? "ক্যাশবুক (মাসিক হিসাব)" : "Cash Book (Monthly Summary)"}
        actions={<MonthSwitcher value={cursor} onChange={setCursor} />}
      />
      <CashBookView
        data={data ?? null}
        loading={isFetching}
        ownerName={current?.name ?? ""}
        subtitle={lang === "bn" ? "এক মাসের সব খাত-ভিত্তিক আয় ও ব্যয়ের সম্পূর্ণ হিসাব।" : "Full categorized income and expense for the selected month."}
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