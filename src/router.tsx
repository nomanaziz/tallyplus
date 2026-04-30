import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    scrollRestoration: false,
    defaultPreload: false,
    defaultErrorComponent: ({ error }) => (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h2>একটি সমস্যা হয়েছে</h2>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, opacity: 0.7 }}>{String(error?.message ?? error)}</pre>
      </div>
    ),
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}