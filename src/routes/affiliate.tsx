import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/pages/Affiliate";

export const Route = createFileRoute("/affiliate")({
  ssr: false,
  component: Layout,
});
