import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "mert_ai_session";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function signature(timestamp, password) {
  return createHmac("sha256", password).update(timestamp).digest("hex");
}

export function isSitePasswordEnabled() {
  return Boolean(process.env.SITE_PASSWORD);
}

export function hasValidSession(req) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return true;

  const cookieHeader = req.headers.cookie || "";
  const cookiePart = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(COOKIE_NAME + "="));
  if (!cookiePart) return false;

  const value = decodeURIComponent(cookiePart.slice(COOKIE_NAME.length + 1));
  const separator = value.indexOf(".");
  if (separator < 1) return false;

  const timestamp = value.slice(0, separator);
  const suppliedSignature = value.slice(separator + 1);
  const issuedAt = Number(timestamp);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(issuedAt) || issuedAt > now + 60 || now - issuedAt > MAX_AGE_SECONDS) return false;

  const expected = signature(timestamp, password);
  const suppliedBuffer = Buffer.from(suppliedSignature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

export function createSessionCookie(password) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const value = timestamp + "." + signature(timestamp, password);
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`;
}

export function passwordsMatch(candidate, expected) {
  if (typeof candidate !== "string" || typeof expected !== "string") return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
