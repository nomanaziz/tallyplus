import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/customer/CreateFordo";

export const Route = createFileRoute("/customer/create-fordo")({
  ssr: false,
  component: Page,
});
