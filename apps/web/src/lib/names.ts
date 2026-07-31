export function fullName(
  firstName?: string | null,
  lastName?: string | null,
): string {
  return [firstName, lastName].filter(Boolean).join(" ");
}

export function companyDisplayName(
  legalName?: string | null,
  tradeName?: string | null,
): string {
  return tradeName || legalName || "";
}
