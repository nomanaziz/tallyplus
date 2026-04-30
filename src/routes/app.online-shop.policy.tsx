import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/online-shop/Policy";

export const Route = createFileRoute("/app/online-shop/policy")({
  ssr: false,
  component: Page,
});
