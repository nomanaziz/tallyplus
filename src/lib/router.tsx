/**
 * Router compatibility shim — backed by react-router-dom v6.
 * Provides Link, useNavigate, useParams, useSearch, useLocation, Outlet,
 * useRouter, redirect, notFound — the API the rest of the codebase already uses.
 */
import {
  Link as RLink,
  Outlet as ROutlet,
  useLocation as useRLocation,
  useNavigate as useRNavigate,
  useParams as useRParams,
  useSearchParams,
  type LinkProps as RLinkProps,
} from "react-router-dom";
import {
  forwardRef,
  useCallback,
  useMemo,
  type AnchorHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";

export const Outlet = ROutlet;

type ParamMap = Record<string, string | number | undefined>;
type SearchInput =
  | Record<string, unknown>
  | string
  | ((prev: Record<string, string>) => Record<string, unknown>);

/** Replace ":param" or "$param" placeholders in a path with values from params. */
function applyParams(path: string, params?: ParamMap): string {
  if (!params) return path;
  return path
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, k) =>
      params[k] != null ? String(params[k]) : `$${k}`,
    )
    .replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, k) =>
      params[k] != null ? String(params[k]) : `:${k}`,
    );
}

function searchToString(search: SearchInput | undefined): string {
  if (search == null) return "";
  if (typeof search === "function") return ""; // resolved later via useNavigate
  if (typeof search === "string") return search.startsWith("?") ? search : `?${search}`;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(search)) {
    if (v == null) continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

function buildTo(opts: {
  to: string;
  params?: ParamMap;
  search?: SearchInput;
  hash?: string;
}): string {
  const path = applyParams(opts.to, opts.params);
  const qs = typeof opts.search === "string" || (opts.search && typeof opts.search === "object")
    ? searchToString(opts.search)
    : "";
  const hash = opts.hash ? (opts.hash.startsWith("#") ? opts.hash : `#${opts.hash}`) : "";
  return `${path}${qs}${hash}`;
}

type ExtraLinkProps = {
  to: string;
  params?: ParamMap;
  search?: SearchInput;
  hash?: string;
  activeProps?: { className?: string; style?: CSSProperties };
  inactiveProps?: { className?: string; style?: CSSProperties };
  preload?: unknown;
  preloadDelay?: number;
  resetScroll?: boolean;
  replace?: boolean;
};

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  ExtraLinkProps & { children?: ReactNode };

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
    resetScroll: _resetScroll,
    replace,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  const href = buildTo({ to, params, search, hash });
  const location = useRLocation();
  const targetPath = href.split("?")[0].split("#")[0];
  const isActive = location.pathname === targetPath;

  const cls = [
    className,
    isActive ? activeProps?.className : inactiveProps?.className,
  ]
    .filter(Boolean)
    .join(" ");
  const sty = { ...(style ?? {}), ...((isActive ? activeProps?.style : inactiveProps?.style) ?? {}) };

  const linkProps: RLinkProps = {
    to: href,
    replace,
    className: cls || undefined,
    style: sty,
  };
  return (
    <RLink ref={ref} {...linkProps} {...(rest as Record<string, unknown>)}>
      {children}
    </RLink>
  );
});

export function useNavigate() {
  const nav = useRNavigate();
  return useCallback(
    (
      opts:
        | string
        | {
            to?: string;
            params?: ParamMap;
            search?: SearchInput;
            hash?: string;
            replace?: boolean;
          },
      extra?: { replace?: boolean },
    ) => {
      if (typeof opts === "string") {
        return nav(applyParams(opts), { replace: extra?.replace });
      }
      let search = opts.search;
      if (typeof search === "function") {
        const sp = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
        const cur: Record<string, string> = {};
        sp.forEach((v, k) => {
          cur[k] = v;
        });
        search = (search as (p: Record<string, string>) => Record<string, unknown>)(cur);
      }
      const href = buildTo({
        to: opts.to ?? ".",
        params: opts.params,
        search: search as SearchInput | undefined,
        hash: opts.hash,
      });
      return nav(href, { replace: opts.replace ?? extra?.replace });
    },
    [nav],
  );
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  return useRParams() as unknown as T;
}

export function useSearch<T extends Record<string, string> = Record<string, string>>(): T {
  const [sp] = useSearchParams();
  return useMemo(() => {
    const o: Record<string, string> = {};
    sp.forEach((v, k) => {
      o[k] = v;
    });
    return o as unknown as T;
  }, [sp]);
}

export function useLocation() {
  return useRLocation();
}

export function useRouter() {
  const navigate = useNavigate();
  return {
    navigate: (opts: Parameters<ReturnType<typeof useNavigate>>[0]) => navigate(opts),
    invalidate: () => Promise.resolve(),
    history: {
      back: () => window.history.back(),
      forward: () => window.history.forward(),
    },
  };
}

export function useRouterState<T = unknown>(): T {
  return false as unknown as T;
}

/**
 * In TanStack, redirect() throws. With react-router-dom there's no equivalent,
 * so we navigate via the history API and throw to halt the calling code path.
 */
export function redirect(opts: { to: string; hash?: string; replace?: boolean }): never {
  const href = buildTo({ to: opts.to, hash: opts.hash });
  if (typeof window !== "undefined") {
    if (opts.replace) window.history.replaceState({}, "", href);
    else window.history.pushState({}, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  throw { __redirect: true, to: href };
}

export function notFound(): Error {
  return new Error("Not found");
}