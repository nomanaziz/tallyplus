import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/customer/MyFordo";

export const Route = createFileRoute("/customer/my-fordo")({
  ssr: false,
  component: Page,
});
