import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/BuySms";

export const Route = createFileRoute("/app/buy-sms")({
  ssr: false,
  component: Page,
});
