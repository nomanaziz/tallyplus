import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/shop/p/Id";

export const Route = createFileRoute("/shop/p/$id")({
  ssr: false,
  component: Page,
});
