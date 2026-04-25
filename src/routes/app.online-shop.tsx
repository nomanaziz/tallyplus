import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/online-shop")({
  component: OnlineShopLayout,
});

function OnlineShopLayout() {
  return <Outlet />;
}
