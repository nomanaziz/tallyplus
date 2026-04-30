import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/affiliate/Register";

export const Route = createFileRoute("/affiliate/register")({
  ssr: false,
  component: Page,
});
