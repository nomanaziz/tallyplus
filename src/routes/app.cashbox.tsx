import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Cashbox";

export const Route = createFileRoute("/app/cashbox")({
  ssr: false,
  component: Page,
});
