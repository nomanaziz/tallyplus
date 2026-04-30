import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/OwnerReport";

export const Route = createFileRoute("/app/owner-report")({
  ssr: false,
  component: Page,
});
