const COOKIE_NAME = "scribe-auth";
const COOKIE_VALUE = "authenticated";

export type AuthEnv = { EDIT_PASSWORD?: string };

export function getEditPassword(env?: AuthEnv): string | undefined {
  const raw = env?.EDIT_PASSWORD ?? process.env.EDIT_PASSWORD;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return undefined;
}

export function isAuthRequired(env?: AuthEnv): boolean {
  return !!getEditPassword(env);
}

export function isAuthenticatedFromRequest(request: Request, env?: AuthEnv): boolean {
  const password = getEditPassword(env);
  if (!password) return true;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match?.[1]?.trim() === COOKIE_VALUE;
}

export function setAuthCookieHeaders(): Headers {
  const h = new Headers();
  h.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${COOKIE_VALUE}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
  return h;
}

export function clearAuthCookieHeaders(): Headers {
  const h = new Headers();
  h.append(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  return h;
}

export function verifyPassword(password: string, env?: AuthEnv): boolean {
  const expected = getEditPassword(env);
  if (!expected) return true;
  return password === expected;
}
