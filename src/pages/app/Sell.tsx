import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { POSPage } from "@/components/app/POSPage";
import { useSearch } from "@/lib/router";

({
  validateSearch: zodValidator(
    z.object({ payment: fallback(z.enum(["cash", "due"]).optional(), undefined).default(undefined) }),
  ),
  component: SellPage,
});

function SellPage() {
  const { payment } = useSearch();
  return <POSPage mode="sell" autoOpenDue={payment === "due"} />;
}
export default SellPage;
