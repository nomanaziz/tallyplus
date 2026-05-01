/**
 * Determine the correct "home" destination for the current user.
 *
 * - Logged-out: "/" (AuthEntry / Facebook-style first screen)
 * - Shop owner: "/app/dashboard"
 * - Personal / customer: "/customer/dashboard"
 */
export function homePathFor(opts: {
  loggedIn: boolean;
  isOwner: boolean;
}): string {
  if (!opts.loggedIn) return "/";
  return opts.isOwner ? "/app/dashboard" : "/customer/dashboard";
}