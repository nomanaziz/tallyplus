import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/Assets"));

export const Route = createFileRoute("/app/assets")({
  ssr: false,
  component: Page,
});
