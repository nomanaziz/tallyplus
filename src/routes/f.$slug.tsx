import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/pages/f/Slug";

export const Route = createFileRoute("/f/$slug")({
  ssr: false,
  component: Layout,
});
