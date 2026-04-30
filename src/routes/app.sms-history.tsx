import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/SmsHistory";

export const Route = createFileRoute("/app/sms-history")({
  ssr: false,
  component: Page,
});
