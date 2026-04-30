import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Contacts";

export const Route = createFileRoute("/app/contacts")({
  ssr: false,
  component: Page,
});
