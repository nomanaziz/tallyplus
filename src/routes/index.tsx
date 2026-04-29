import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { RouteSkeleton } from "@/components/app/RouteSkeleton";

const LegacyApp = lazy(() => import("@/App"));

export const Route = createFileRoute("/")({
  ssr: false,
  component: () => (
    <Suspense fallback={<RouteSkeleton />}>
      <LegacyApp />
    </Suspense>
  ),
});