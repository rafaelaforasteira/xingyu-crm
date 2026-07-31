export function isNavActive(
  pathname: string,
  href: string,
  pendingHref?: string | null,
): boolean {
  const pathMatch =
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
  const pendingMatch =
    pendingHref === href ||
    (pendingHref != null &&
      href !== "/" &&
      pendingHref.startsWith(`${href}/`));
  return pathMatch || pendingMatch;
}

export function extractPipelineIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/pipelines\/([^/]+)/);
  return match?.[1] ?? null;
}
