import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/Sell";

export const Route = createFileRoute("/app/sell")({
  ssr: false,
  component: Page,
});
