import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/pages/app/OnlineShop";

export const Route = createFileRoute("/app/online-shop")({
  ssr: false,
  component: Layout,
});
