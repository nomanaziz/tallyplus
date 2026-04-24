import { createFileRoute } from "@tanstack/react-router";
import { POSPage } from "@/components/app/POSPage";

export const Route = createFileRoute("/app/purchase")({
  component: () => <POSPage mode="purchase" />,
});