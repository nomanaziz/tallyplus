import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/online-shop/Customize";

export const Route = createFileRoute("/app/online-shop/customize")({
  ssr: false,
  component: Page,
});
