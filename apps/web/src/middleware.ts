import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_COOKIE = "xingyu_access_token";
const REFRESH_COOKIE = "xingyu_refresh_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession =
    Boolean(request.cookies.get(ACCESS_COOKIE)?.value) ||
    Boolean(request.cookies.get(REFRESH_COOKIE)?.value);

  if (pathname === "/login") {
    if (hasSession) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(hasSession ? "/dashboard" : "/login", request.url),
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
    "/automations/:path*",
    "/marketing/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/notifications/:path*",
    "/search/:path*",
  ],
};
