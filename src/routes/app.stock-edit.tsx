import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/stock-edit")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/app/products", replace: true });
  },
});
