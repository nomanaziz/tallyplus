import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/online-shop/Settings";

export const Route = createFileRoute("/app/online-shop/settings")({
  ssr: false,
  component: Page,
});
