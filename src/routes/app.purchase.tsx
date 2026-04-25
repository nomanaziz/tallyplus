import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { POSPage } from "@/components/app/POSPage";

export const Route = createFileRoute("/app/purchase")({
  validateSearch: zodValidator(
    z.object({ payment: fallback(z.enum(["cash", "due"]).optional(), undefined).default(undefined) }),
  ),
  component: PurchasePage,
});

function PurchasePage() {
  const { payment } = Route.useSearch();
  return <POSPage mode="purchase" autoOpenDue={payment === "due"} />;
}