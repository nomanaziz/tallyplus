import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Products";

export const Route = createFileRoute("/app/products")({
  ssr: false,
  component: Page,
});
