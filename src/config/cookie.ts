import { FastifyRequest } from "fastify";
import { env } from "./env";

export interface CookieOptions {
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "none" | "lax" | "strict";
  maxAge?: number;
  domain?: string;
}

/**
 * Retorna as configurações seguras para cookies HttpOnly.
 *
 * Quando em subdomínio de vivasf.com.br (ex: api.conecta.vivasf.com.br),
 * domain é configurado como .vivasf.com.br e sameSite="lax", permitindo que
 * o Safari no iPhone / iOS envie os cookies normalmente sem bloqueio do ITP.
 *
 * Em domínios totalmente distintos sem proxy (ex: railway.app cross-site), usa sameSite="none".
 * Em localhost/127.0.0.1, utiliza "lax" e secure=false.
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

  const isVivaSf =
    host.endsWith("vivasf.com.br") ||
    Boolean(env.COOKIE_DOMAIN && env.COOKIE_DOMAIN.includes("vivasf.com.br"));

  const domain = env.COOKIE_DOMAIN || (isVivaSf ? ".vivasf.com.br" : undefined);

  return {
    path: "/",
    httpOnly: true,
    secure: isHttps,
    sameSite: isVivaSf ? "lax" : isHttps && !isLocalhost ? "none" : "lax",
    ...(domain ? { domain } : {}),
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}
