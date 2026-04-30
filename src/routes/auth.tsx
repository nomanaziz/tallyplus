import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/Auth"));

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: Page,
});
