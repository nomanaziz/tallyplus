import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/customer/Notes"));

export const Route = createFileRoute("/customer/notes")({
  ssr: false,
  component: Page,
});
