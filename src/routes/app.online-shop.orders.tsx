import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/online-shop/Orders";

export const Route = createFileRoute("/app/online-shop/orders")({
  ssr: false,
  component: Page,
});
