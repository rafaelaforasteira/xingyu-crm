import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_COOKIE = "xingyu_access_token";
const REFRESH_COOKIE = "xingyu_refresh_token";

const DEFAULT_APP_HOME = "/pipelines";

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
    "/clients/:path*",
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
