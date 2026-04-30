import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/RecycleBin";

export const Route = createFileRoute("/app/recycle-bin")({
  ssr: false,
  component: Page,
});
