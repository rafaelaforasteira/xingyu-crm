import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_COOKIE = "xingyu_access_token";
const REFRESH_COOKIE = "xingyu_refresh_token";

const CORE_OPERATION_MODE =
  process.env.NEXT_PUBLIC_CORE_OPERATION_MODE !== "false";
const BETA_SINGLE_PIPELINE_MODE =
  process.env.NEXT_PUBLIC_BETA_SINGLE_PIPELINE_MODE !== "false";
const DEFAULT_APP_HOME =
  BETA_SINGLE_PIPELINE_MODE || CORE_OPERATION_MODE ? "/operacao" : "/dashboard";

const BETA_BLOCKED_PREFIXES = [
  "/dashboard",
  "/pipelines",
  "/inbox",
  "/contacts",
  "/companies",
  "/orders",
  "/tasks",
  "/reports",
  "/automations",
  "/settings",
  "/marketing",
  "/repurchase",
  "/reactivation",
  "/after-sales",
  "/products",
  "/occurrences",
  "/notifications",
  "/search",
] as const;

function isBetaBlockedPath(pathname: string): boolean {
  if (
    !pathname ||
    pathname === "/operacao" ||
    pathname.startsWith("/operacao/")
  ) {
    return false;
  }
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return false;
  }
  return BETA_BLOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession =
    Boolean(request.cookies.get(ACCESS_COOKIE)?.value) ||
    Boolean(request.cookies.get(REFRESH_COOKIE)?.value);

  if (pathname === "/login") {
    if (hasSession) {
      return NextResponse.redirect(new URL(DEFAULT_APP_HOME, request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(hasSession ? DEFAULT_APP_HOME : "/login", request.url),
    );
  }

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (BETA_SINGLE_PIPELINE_MODE && isBetaBlockedPath(pathname)) {
    return NextResponse.redirect(new URL("/operacao", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/operacao/:path*",
    "/dashboard/:path*",
    "/contacts/:path*",
    "/companies/:path*",
    "/pipelines/:path*",
    "/inbox/:path*",
    "/tasks/:path*",
    "/orders/:path*",
    "/products/:path*",
    "/occurrences/:path*",
    "/repurchase/:path*",
    "/reactivation/:path*",
    "/after-sales/:path*",
    "/automations/:path*",
    "/marketing/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/notifications/:path*",
    "/search/:path*",
  ],
};
