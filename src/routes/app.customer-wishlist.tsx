import { createFileRoute } from "@tanstack/react-router";
import Page from "@/pages/app/CustomerWishlist";

export const Route = createFileRoute("/app/customer-wishlist")({
  ssr: false,
  component: Page,
});
