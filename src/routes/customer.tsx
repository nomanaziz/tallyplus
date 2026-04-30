import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/pages/customer/CustomerLayout";

export const Route = createFileRoute("/customer")({
  ssr: false,
  component: Layout,
});
