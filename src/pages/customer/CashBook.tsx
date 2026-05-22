import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { CashBookView, MonthSwitcher, useDefaultMonth, type MonthCursor } from "@/components/app/CashBookView";
import { loadConsumerCashBook } from "@/lib/cash-book-queries";

export default function CustomerCashBookPage() {
  const { user } = useAuth();
  const { lang, t } = useI18n();
  const def = useDefaultMonth();
  const [cursor, setCursor] = useState<MonthCursor>(def);

  const { data, isFetching } = useQuery({
    queryKey: ["consumer-cash-book", user?.id, cursor.year, cursor.month0],
    queryFn: () => loadConsumerCashBook(user!.id, cursor.year, cursor.month0),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const userName =
    (user?.user_metadata as { full_name?: string } | undefined)?.full_name ||
    user?.email ||
    (t("p7_My_Cash_Book"));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9">
            <Link to="/customer/money"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{t("p7_Cash_Book")}</h1>
            <div className="text-xs text-muted-foreground">
              {t("p7_Monthly_categorized_income_exp")}
            </div>
          </div>
        </div>
        <MonthSwitcher value={cursor} onChange={setCursor} />
      </div>

      <div className="-mx-4 sm:-mx-6">
        <CashBookView data={data ?? null} loading={isFetching} ownerName={String(userName)} />
      </div>
    </div>
  );
}