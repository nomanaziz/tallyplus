import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/shop/s/Slug";

export const Route = createFileRoute("/shop/s/$slug")({
  ssr: false,
  component: Page,
});
