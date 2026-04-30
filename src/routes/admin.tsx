import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/pages/Admin";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: Layout,
});
