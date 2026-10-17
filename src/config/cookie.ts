import { FastifyRequest } from "fastify";
import { env } from "./env";

export interface CookieOptions {
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "none" | "lax" | "strict";
  maxAge?: number;
}

/**
 * Retorna as configurações seguras para cookies HttpOnly.
 *
 * Em produção/nuvem (ex: Railway, HTTPS), o frontend e backend podem estar
 * em subdomínios ou domínios diferentes. Para que o navegador envie os cookies
 * HttpOnly em requisições CORS/fetch (credentials: "include"), SameSite PRECISA
 * ser "none" e Secure DEVE ser true.
 *
 * Em localhost/127.0.0.1 (desenvolvimento HTTP sem TLS), SameSite="none" não é
 * permitido pelos navegadores sem Secure (e Secure em HTTP pura pode falhar),
 * logo utiliza "lax" e secure=false.
 */
export function getCookieOptions(
  request: FastifyRequest,
  maxAge?: number,
): CookieOptions {
  const host = (request.headers.host || "").toLowerCase();
  const forwardedProto = (
    (request.headers["x-forwarded-proto"] as string) || ""
  ).toLowerCase();

  const isLocalhost =
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.startsWith("192.168.") ||
    host.startsWith("10.");

  const isHttps =
    request.protocol === "https" ||
    forwardedProto === "https" ||
    (!isLocalhost && (env.NODE_ENV === "production" || host.includes("railway.app")));

  return {
    path: "/",
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps && !isLocalhost ? "none" : "lax",
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}
