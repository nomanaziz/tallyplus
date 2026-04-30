import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/pages/shop/Index";

export const Route = createFileRoute("/shop")({
  ssr: false,
  component: Layout,
});
