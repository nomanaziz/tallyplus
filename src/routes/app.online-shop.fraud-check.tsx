import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/online-shop/FraudCheck";

export const Route = createFileRoute("/app/online-shop/fraud-check")({
  ssr: false,
  component: Page,
});
