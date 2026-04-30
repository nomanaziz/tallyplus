import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/f/Slug";

export const Route = createFileRoute("/f/")({
  ssr: false,
  component: Page,
});
