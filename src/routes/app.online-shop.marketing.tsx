import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/online-shop/Marketing";

export const Route = createFileRoute("/app/online-shop/marketing")({
  ssr: false,
  component: Page,
});
