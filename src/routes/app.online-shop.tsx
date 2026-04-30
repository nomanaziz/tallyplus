import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/pages/app/online-shop/Index";

export const Route = createFileRoute("/app/online-shop")({
  ssr: false,
  component: Layout,
});
