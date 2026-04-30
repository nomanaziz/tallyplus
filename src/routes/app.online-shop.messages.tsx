import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/online-shop/Messages";

export const Route = createFileRoute("/app/online-shop/messages")({
  ssr: false,
  component: Page,
});
