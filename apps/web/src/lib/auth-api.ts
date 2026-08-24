import type { AuthUser } from "./auth-types";
import { ApiError } from "./api";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:3000/api" : "");

if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL não foi definida.");

function authUrl(path: string): string {
  const base = API_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const requestPath =
    /\/api$/i.test(base) && normalizedPath.startsWith("/api/")
      ? normalizedPath.slice(4)
      : normalizedPath;
  return `${base}${requestPath}`;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function authRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(authUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = await parseJson(response);
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      (typeof (body as { message: unknown }).message === "string" ||
        Array.isArray((body as { message: unknown }).message))
        ? Array.isArray((body as { message: unknown }).message)
          ? ((body as { message: string[] }).message).join(", ")
          : ((body as { message: string }).message)
        : "Falha na autenticação.";
    throw new ApiError(message, response.status, body);
  }
  return body as T;
}

export const authApi = {
  login(email: string, password: string) {
    return authRequest<{ user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  logout() {
    return authRequest<{ ok: true }>("/auth/logout", { method: "POST" });
  },

  refresh() {
    return authRequest<{ user: AuthUser }>("/auth/refresh", { method: "POST" });
  },

  me() {
    return authRequest<AuthUser>("/auth/me");
  },

  changePassword(data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    return authRequest<{ ok: true }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
