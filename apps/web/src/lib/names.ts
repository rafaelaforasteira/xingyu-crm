export function fullName(
  firstName?: string | null,
  lastName?: string | null,
): string {
  return [firstName, lastName].filter(Boolean).join(" ");
}

/** Display-only first token of a full name. Does not mutate stored user.name. */
export function displayFirstName(name?: string | null, fallback = "Usuário"): string {
  const trimmed = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (!trimmed) return fallback;
  return trimmed.split(" ")[0] ?? fallback;
}

/** Split a stored full name into first + remaining last for edit forms. */
export function splitDisplayName(name?: string | null): { firstName: string; lastName: string } {
  const trimmed = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(" ");
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

/** Recompose first + last into a single stored name. */
export function joinDisplayName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").replace(/\s+/g, " ");
}

export function companyDisplayName(
  legalName?: string | null,
  tradeName?: string | null,
): string {
  return tradeName || legalName || "";
}
