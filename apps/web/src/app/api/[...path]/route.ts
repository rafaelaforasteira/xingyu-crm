import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getApiUpstream() {
  return (
    process.env.API_URL?.replace(/\/+$/, "") ||
    `http://127.0.0.1:${process.env.API_PORT ?? 3333}`
  );
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;

  const target = new URL(`${getApiUpstream()}/api/${path.join("/")}`);
  target.search = request.nextUrl.search;

  const requestHeaders = new Headers(request.headers);

  requestHeaders.delete("host");
  requestHeaders.delete("content-length");
  requestHeaders.delete("accept-encoding");

  const hasBody =
    request.method !== "GET" &&
    request.method !== "HEAD";

  const body = hasBody
    ? await request.arrayBuffer()
    : undefined;

  const upstreamResponse = await fetch(target, {
    method: request.method,
    headers: requestHeaders,
    body,
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = new Headers(upstreamResponse.headers);

  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("set-cookie");

  const headersWithCookies = upstreamResponse.headers as Headers & {
    getSetCookie?: () => string[];
  };

  const setCookies = headersWithCookies.getSetCookie
    ? headersWithCookies.getSetCookie()
    : upstreamResponse.headers.get("set-cookie")
      ? [upstreamResponse.headers.get("set-cookie") as string]
      : [];

  for (const cookie of setCookies) {
    responseHeaders.append("set-cookie", cookie);
  }

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;
export const HEAD = proxyRequest;
