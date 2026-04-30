import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/customer/Notes";

export const Route = createFileRoute("/customer/notes")({
  ssr: false,
  component: Page,
});
