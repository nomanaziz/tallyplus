import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { POSPage } from "@/components/app/POSPage";

export const Route = createFileRoute("/app/sell")({
  validateSearch: zodValidator(
    z.object({ payment: fallback(z.enum(["cash", "due"]).optional(), undefined).default(undefined) }),
  ),
  component: SellPage,
});

function SellPage() {
  const { payment } = Route.useSearch();
  return <POSPage mode="sell" autoOpenDue={payment === "due"} />;
}