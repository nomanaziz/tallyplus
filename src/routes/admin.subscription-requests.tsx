import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/admin/SubscriptionRequests";

export const Route = createFileRoute("/admin/subscription-requests")({
  ssr: false,
  component: Page,
});
