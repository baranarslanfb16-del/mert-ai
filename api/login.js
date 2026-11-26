import { createSessionCookie, hasValidSession, isSitePasswordEnabled, passwordsMatch } from "../lib/security.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const enabled = isSitePasswordEnabled();
    return res.status(200).json({ enabled, authenticated: !enabled || hasValidSession(req) });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Bu istek yöntemi desteklenmiyor." });
  }

  const expectedPassword = process.env.SITE_PASSWORD;
  if (!expectedPassword) return res.status(200).json({ ok: true, message: "Giriş şifresi ayarlanmamış." });

  const candidate = req.body && req.body.password;
  if (!passwordsMatch(candidate, expectedPassword)) {
    return res.status(401).json({ ok: false, error: "Şifre yanlış. Tekrar dene." });
  }

  res.setHeader("Set-Cookie", createSessionCookie(expectedPassword));
  return res.status(200).json({ ok: true });
}
