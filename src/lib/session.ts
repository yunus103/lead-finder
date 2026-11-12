export const SESSION_COOKIE = "lf_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

// Cookie value is derived from the password, so changing APP_PASSWORD logs every device out.
// Web Crypto keeps this usable from both the Edge middleware and Node server actions.
export async function sessionToken(password: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`lead-finder:${password}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
