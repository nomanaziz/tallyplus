import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/customer/Dashboard";

export const Route = createFileRoute("/customer/dashboard")({
  ssr: false,
  component: Page,
});
