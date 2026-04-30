import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/pages/app/AppLayout";

export const Route = createFileRoute("/app")({
  ssr: false,
  component: Layout,
});
