import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  "/api/stripe/webhook",
]);

const BYPASS_ADMIN_CHECK =
  process.env.BYPASS_ADMIN_CHECK === "true" ||
  process.env.NODE_ENV === "development";

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  // Allow admin analytics route in dev or when bypass flag is set
  if (
    BYPASS_ADMIN_CHECK &&
    (pathname === "/admin/analytics" || pathname.startsWith("/admin/analytics/"))
  ) {
    return;
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
