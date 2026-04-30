import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/RecycleBin"));

export const Route = createFileRoute("/app/recycle-bin")({
  ssr: false,
  component: Page,
});
