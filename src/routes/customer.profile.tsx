import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/customer/Profile";

export const Route = createFileRoute("/customer/profile")({
  ssr: false,
  component: Page,
});
