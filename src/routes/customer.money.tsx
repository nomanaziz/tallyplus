import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/customer/Money";

export const Route = createFileRoute("/customer/money")({
  ssr: false,
  component: Page,
});
