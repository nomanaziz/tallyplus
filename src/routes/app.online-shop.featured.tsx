import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/online-shop/Featured";

export const Route = createFileRoute("/app/online-shop/featured")({
  ssr: false,
  component: Page,
});
