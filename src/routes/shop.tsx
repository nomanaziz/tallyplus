import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/shop/Index";

export const Route = createFileRoute("/shop")({
  ssr: false,
  component: Page,
});
