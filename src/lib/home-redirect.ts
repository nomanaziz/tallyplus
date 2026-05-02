/**
 * Determine the correct "home" destination for the current user.
 *
 * - Logged-out: "/" (AuthEntry / Facebook-style first screen)
 * - Admin:      "/admin"
 * - Shop owner: "/app/dashboard"
 * - Personal / customer: "/customer/dashboard"
 */
export function homePathFor(opts: {
  loggedIn: boolean;
  isOwner: boolean;
  isAdmin?: boolean;
}): string {
  if (!opts.loggedIn) return "/";
  if (opts.isAdmin) return "/admin";
  return opts.isOwner ? "/app/dashboard" : "/customer/dashboard";
}