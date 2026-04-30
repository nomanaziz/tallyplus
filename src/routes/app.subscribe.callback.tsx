import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/SubscribeCallback";

export const Route = createFileRoute("/app/subscribe/callback")({
  ssr: false,
  component: Page,
});
