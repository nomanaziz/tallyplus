import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/online-shop/Delivery";

export const Route = createFileRoute("/app/online-shop/delivery")({
  ssr: false,
  component: Page,
});
