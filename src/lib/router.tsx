/**
 * Router compatibility shim.
 * Provides a stable API (Link, useNavigate, useParams, useSearch, useLocation,
 * Outlet, useRouter, redirect, notFound) backed by @tanstack/react-router.
 *
 * The rest of the codebase imports from "@/lib/router" — this file lets us
 * migrate the underlying router without touching every call site.
 */
import {
  Link as TLink,
  Outlet as TOutlet,
  useLocation as useTLocation,
  useNavigate as useTNavigate,
  useParams as useTParams,
  useRouter as useTRouter,
  useSearch as useTSearch,
  redirect as tRedirect,
  notFound as tNotFound,
} from "@tanstack/react-router";
import { forwardRef, type ReactNode, type AnchorHTMLAttributes, type CSSProperties } from "react";

export const Outlet = TOutlet;

type NavOpts = {
  to?: string;
  params?: Record<string, string | number | undefined>;
  search?: Record<string, unknown> | string | ((prev: Record<string, string>) => Record<string, unknown>);
  hash?: string;
  replace?: boolean;
};

type ExtraLinkProps = {
  to: string;
  params?: Record<string, string | number | undefined>;
  search?: Record<string, unknown> | string;
  hash?: string;
  activeProps?: { className?: string; style?: CSSProperties };
  inactiveProps?: { className?: string; style?: CSSProperties };
  preload?: unknown;
  preloadDelay?: number;
  resetScroll?: boolean;
  replace?: boolean;
};

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> &
  ExtraLinkProps & { children?: ReactNode };

/** Convert search input into the object form TanStack expects. */
function normalizeSearch(search?: Record<string, unknown> | string):
  | Record<string, unknown>
  | undefined {
  if (search == null) return undefined;
  if (typeof search === "string") {
    const usp = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    const out: Record<string, string> = {};
    usp.forEach((v, k) => { out[k] = v; });
    return out;
  }
  return search;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  {
    to,
    params,
    search,
    hash,
    activeProps,
    inactiveProps,
    preload: _preload,
    preloadDelay: _preloadDelay,
    resetScroll,
    replace,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  // Map ":id" style to TanStack "$id" style for safety; TanStack natively uses $.
  const tanstackTo = to.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "$$$1");
  return (
    <TLink
      ref={ref}
      to={tanstackTo}
      // @ts-expect-error - dynamic params; codebase relies on loose typing.
      params={params}
      search={normalizeSearch(search) as never}
      hash={hash}
      replace={replace}
      resetScroll={resetScroll}
      className={className as never}
      style={style as never}
      activeProps={activeProps as never}
      inactiveProps={inactiveProps as never}
      {...(rest as Record<string, unknown>)}
    >
      {children as never}
    </TLink>
  );
});

export function useNavigate() {
  const nav = useTNavigate();
  return (opts: string | NavOpts) => {
    if (typeof opts === "string") {
      const tanstackTo = opts.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "$$$1");
      return nav({ to: tanstackTo as never });
    }
    let search = opts.search;
    if (typeof search === "function") {
      const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const cur: Record<string, string> = {};
      sp.forEach((v, k) => { cur[k] = v; });
      search = (search as (p: Record<string, string>) => Record<string, unknown>)(cur);
    }
    const tanstackTo = (opts.to ?? ".").replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "$$$1");
    return nav({
      to: tanstackTo as never,
      // @ts-expect-error - loose params
      params: opts.params,
      search: normalizeSearch(search as Record<string, unknown> | string | undefined) as never,
      hash: opts.hash,
      replace: opts.replace,
    });
  };
}

export function useParams<T extends Record<string, string> = Record<string, string>>(
  _opts?: { strict?: boolean },
): T {
  // strict: false returns all params from current matches.
  return useTParams({ strict: false }) as unknown as T;
}

export function useSearch<T extends Record<string, string> = Record<string, string>>(
  _opts?: { strict?: boolean },
): T {
  return useTSearch({ strict: false }) as unknown as T;
}

export function useLocation() {
  return useTLocation();
}

export function useRouter() {
  const router = useTRouter();
  const navigate = useNavigate();
  return {
    navigate: (opts: Parameters<ReturnType<typeof useNavigate>>[0]) => navigate(opts),
    invalidate: () => router.invalidate(),
    history: {
      back: () => router.history.back(),
      forward: () => router.history.forward(),
    },
  };
}

export function useRouterState<T = unknown>(_opts?: { select?: (s: unknown) => T }): T {
  return false as unknown as T;
}

export function redirect(opts: { to: string; hash?: string; replace?: boolean }): never {
  const tanstackTo = opts.to.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, "$$$1");
  // tRedirect throws internally.
  throw tRedirect({ to: tanstackTo as never, hash: opts.hash, replace: opts.replace });
}

export function notFound(): Error {
  return tNotFound() as unknown as Error;
}
