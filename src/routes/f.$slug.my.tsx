import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/f/slug/My";

export const Route = createFileRoute("/f/$slug/my")({
  ssr: false,
  component: Page,
});
