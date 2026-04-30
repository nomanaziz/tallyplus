import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/online-shop/Themes";

export const Route = createFileRoute("/app/online-shop/themes")({
  ssr: false,
  component: Page,
});
