import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/online-shop/Products";

export const Route = createFileRoute("/app/online-shop/products")({
  ssr: false,
  component: Page,
});
