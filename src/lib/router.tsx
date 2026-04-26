/**
 * Router compatibility shim.
 * Provides TanStack-Router-like API names backed by react-router-dom v7.
 * Lets the codebase keep its existing import call sites with minimal change.
 */
import {
  Link as RRLink,
  NavLink,
  Outlet as RROutlet,
  useLocation as useRRLocation,
  useNavigate as useRRNavigate,
  useParams as useRRParams,
  useSearchParams,
  type LinkProps as RRLinkProps,
} from "react-router-dom";
import { forwardRef, type ReactNode, type AnchorHTMLAttributes } from "react";

export { RROutlet as Outlet };

type ExtraLinkProps = {
  to: string;
  params?: Record<string, string | number | undefined>;
  search?: Record<string, unknown> | string;
  hash?: string;
  activeProps?: { className?: string; style?: React.CSSProperties };
  inactiveProps?: { className?: string; style?: React.CSSProperties };
  preload?: unknown;
  preloadDelay?: number;
  resetScroll?: boolean;
};

type LinkProps = Omit<RRLinkProps, "to"> &
  AnchorHTMLAttributes<HTMLAnchorElement> &
  ExtraLinkProps & { children?: ReactNode };

function buildPath(
  to: string,
  params?: Record<string, string | number | undefined>,
  search?: Record<string, unknown> | string,
  hash?: string
): string {
  let path = to;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      // tanstack uses $param style; react-router uses :param. Support both.
      path = path.replace(new RegExp(`\\$${k}|:${k}`, "g"), encodeURIComponent(String(v ?? "")));
    }
  }
  let qs = "";
  if (search) {
    if (typeof search === "string") {
      qs = search.startsWith("?") ? search : `?${search}`;
    } else {
      const usp = new URLSearchParams();
      for (const [k, v] of Object.entries(search)) {
        if (v === undefined || v === null) continue;
        usp.set(k, String(v));
      }
      const s = usp.toString();
      if (s) qs = `?${s}`;
    }
  }
  return path + qs + (hash ? (hash.startsWith("#") ? hash : `#${hash}`) : "");
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, params, search, hash, activeProps, inactiveProps, preload, preloadDelay, resetScroll, className, style, children, ...rest },
  ref
) {
  const finalTo = buildPath(to, params, search, hash);
  if (activeProps || inactiveProps) {
    return (
      <NavLink
        ref={ref as never}
        to={finalTo}
        end={to === "/"}
        className={({ isActive }) => {
          const base = typeof className === "string" ? className : "";
          const extra = isActive ? activeProps?.className ?? "" : inactiveProps?.className ?? "";
          return [base, extra].filter(Boolean).join(" ");
        }}
        style={({ isActive }) => ({
          ...(typeof style === "object" && style ? style : {}),
          ...(isActive ? activeProps?.style : inactiveProps?.style),
        })}
        {...rest}
      >
        {children}
      </NavLink>
    );
  }
  return (
    <RRLink ref={ref as never} to={finalTo} className={className} style={style} {...rest}>
      {children}
    </RRLink>
  );
});

/** Tanstack-style useNavigate returning a function that takes { to, params, search, replace, hash } */
export function useNavigate() {
  const nav = useRRNavigate();
  return (opts: string | { to: string; params?: Record<string, string | number | undefined>; search?: Record<string, unknown> | string; hash?: string; replace?: boolean }) => {
    if (typeof opts === "string") return nav(opts);
    const path = buildPath(opts.to, opts.params, opts.search, opts.hash);
    return nav(path, { replace: opts.replace });
  };
}

export function useParams<T extends Record<string, string> = Record<string, string>>(_opts?: { strict?: boolean }) {
  return useRRParams() as T;
}

export function useSearch<T extends Record<string, string> = Record<string, string>>(_opts?: { strict?: boolean }): T {
  const [sp] = useSearchParams();
  const out: Record<string, string> = {};
  sp.forEach((v, k) => {
    out[k] = v;
  });
  return out as T;
}

export function useLocation() {
  return useRRLocation();
}

/** Minimal useRouter shim — just enough for the few call sites. */
export function useRouter() {
  const navigate = useNavigate();
  return {
    navigate: (opts: Parameters<ReturnType<typeof useNavigate>>[0]) => navigate(opts),
    invalidate: () => {
      // SPA: caller usually wants to refresh data. No-op; queries are cached by TanStack Query.
    },
    history: {
      back: () => window.history.back(),
      forward: () => window.history.forward(),
    },
  };
}

/** Minimal stub. SPA loads instantly; router state used only for transition bars. */
export function useRouterState<T = unknown>(_opts?: { select?: (s: { isLoading: boolean; isTransitioning: boolean; location: ReturnType<typeof useRRLocation> }) => T }): T {
  return false as unknown as T;
}
