import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/Contacts"));

export const Route = createFileRoute("/app/contacts")({
  ssr: false,
  component: Page,
});
