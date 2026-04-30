import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
const Page = lazyRouteComponent(() => import("@/pages/app/CustomerWishlist"));

export const Route = createFileRoute("/app/customer-wishlist")({
  ssr: false,
  component: Page,
});
