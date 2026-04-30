import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/f/slug/My"));

export const Route = createFileRoute("/f/$slug/my")({
  ssr: false,
  component: Page,
});
