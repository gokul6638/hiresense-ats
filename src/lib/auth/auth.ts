import jwt from "jsonwebtoken";

export const AUTH_COOKIE_NAME = "hiresense_token";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET env var");
  return secret;
}

export type AuthPayload = {
  sub: string;      // user id
  username: string; // admin username
};

export function signAuthToken(payload: AuthPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyAuthToken(token: string): AuthPayload {
  return jwt.verify(token, getJwtSecret()) as AuthPayload;
}

export function buildAuthCookie(token: string) {
  const isProd = process.env.NODE_ENV === "production";

  // HttpOnly cookie: JS in browser cannot read it
  // SameSite=Lax: good default
  // Secure: only over HTTPS in production
  return `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; ${
    isProd ? "Secure; " : ""
  }Max-Age=${60 * 60 * 24 * 7}`;
}

export function buildClearAuthCookie() {
  const isProd = process.env.NODE_ENV === "production";
  return `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; ${
    isProd ? "Secure; " : ""
  }Max-Age=0`;
}
