import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { POSPage } from "@/components/app/POSPage";
import { useSearch } from "@/lib/router";

({
  validateSearch: zodValidator(
    z.object({ payment: fallback(z.enum(["cash", "due"]).optional(), undefined).default(undefined) }),
  ),
  component: PurchasePage,
});

function PurchasePage() {
  const { payment } = useSearch();
  return <POSPage mode="purchase" autoOpenDue={payment === "due"} />;
}
export default PurchasePage;
