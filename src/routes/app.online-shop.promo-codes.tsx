import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/online-shop/PromoCodes";

export const Route = createFileRoute("/app/online-shop/promo-codes")({
  ssr: false,
  component: Page,
});
