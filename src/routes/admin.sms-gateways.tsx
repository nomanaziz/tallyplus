import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/SmsGateways";

export const Route = createFileRoute("/admin/sms-gateways")({
  ssr: false,
  component: Page,
});
