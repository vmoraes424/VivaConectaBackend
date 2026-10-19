import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../app";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../shared/errors";
import { getCookieOptions } from "../config/cookie";

describe("App & Security Tests", () => {
  test("CORS: nega origem não permitida e não retorna access-control-allow-origin", async () => {
    const app = buildApp();
    await app.ready();

    const res = await app.inject({
      method: "OPTIONS",
      url: "/api/auth/login",
      headers: {
        origin: "https://evil.com",
        "access-control-request-method": "POST",
      },
    });

    assert.equal(res.headers["access-control-allow-origin"], undefined);
    await app.close();
  });

  test("CORS: aceita origem permitida em ambiente de desenvolvimento", async () => {
    const app = buildApp();
    await app.ready();

    const res = await app.inject({
      method: "OPTIONS",
      url: "/api/auth/login",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "POST",
      },
    });

    assert.equal(res.headers["access-control-allow-origin"], "http://localhost:3000");
    await app.close();
  });

  test("Helmet: adiciona headers de segurança", async () => {
    const app = buildApp();
    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/health",
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["x-content-type-options"], "nosniff");
    assert.ok(res.headers["x-frame-options"]);
    await app.close();
  });

  test("Error Handler: 500 não vaza mensagens internas do servidor", async () => {
    const app = buildApp();

    app.get("/__test_boom", async () => {
      throw new Error("Erro secreto de conexao com banco postgresql://admin:secret");
    });

    await app.ready();

    const res = await app.inject({
      method: "GET",
      url: "/__test_boom",
    });

    assert.equal(res.statusCode, 500);
    const body = res.json();
    assert.equal(body.message, "Erro interno do servidor.");
    assert.equal(JSON.stringify(body).includes("postgres"), false);
    await app.close();
  });

  test("Error Handler: mapeia subclasses de AppError para seus respectivos HTTP status codes", async () => {
    const app = buildApp();

    app.get("/__test_not_found", async () => {
      throw new NotFoundError("Recurso teste não encontrado.");
    });
    app.get("/__test_conflict", async () => {
      throw new ConflictError("Conflito teste de dados.");
    });
    app.get("/__test_forbidden", async () => {
      throw new ForbiddenError("Acesso negado para este teste.");
    });
    app.get("/__test_bad_request", async () => {
      throw new BadRequestError("Parâmetro inválido.");
    });

    await app.ready();

    const resNotFound = await app.inject({ method: "GET", url: "/__test_not_found" });
    assert.equal(resNotFound.statusCode, 404);
    assert.equal(resNotFound.json().message, "Recurso teste não encontrado.");

    const resConflict = await app.inject({ method: "GET", url: "/__test_conflict" });
    assert.equal(resConflict.statusCode, 409);
    assert.equal(resConflict.json().message, "Conflito teste de dados.");

    const resForbidden = await app.inject({ method: "GET", url: "/__test_forbidden" });
    assert.equal(resForbidden.statusCode, 403);
    assert.equal(resForbidden.json().message, "Acesso negado para este teste.");

    const resBadRequest = await app.inject({ method: "GET", url: "/__test_bad_request" });
    assert.equal(resBadRequest.statusCode, 400);
    assert.equal(resBadRequest.json().message, "Parâmetro inválido.");

    await app.close();
  });

  test("Rate limit: bloqueia requisições excessivas (429)", async () => {
    const app = buildApp();
    await app.ready();

    // /api/auth/login tem limite de 5 requisições por minuto
    let reachedRateLimit = false;
    for (let i = 0; i < 7; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: { email: "teste@example.com", senha: "senha" },
      });

      if (res.statusCode === 429) {
        reachedRateLimit = true;
        break;
      }
    }

    assert.equal(reachedRateLimit, true);
    await app.close();
  });

  test("Upload: rota de upload exige autenticação (401)", async () => {
    const app = buildApp();
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/upload/avatar",
    });

    assert.equal(res.statusCode, 401);
    await app.close();
  });

  test("Cookies: localhost utiliza sameSite=lax e secure=false", () => {
    const req = {
      protocol: "http",
      headers: { host: "localhost:3333" },
    };
    const opts = getCookieOptions(req as any, 3600);
    assert.equal(opts.sameSite, "lax");
    assert.equal(opts.secure, false);
    assert.equal(opts.httpOnly, true);
    assert.equal(opts.maxAge, 3600);
  });

  test("Cookies: ambiente Railway/HTTPS utiliza sameSite=none e secure=true para cross-site", () => {
    const req = {
      protocol: "https",
      headers: {
        host: "viva-conecta-backend.up.railway.app",
        "x-forwarded-proto": "https",
      },
    };
    const opts = getCookieOptions(req as any, 3600);
    assert.equal(opts.sameSite, "none");
    assert.equal(opts.secure, true);
    assert.equal(opts.httpOnly, true);
  });

  test("Cookies: subdomínio vivasf.com.br utiliza sameSite=lax e domain=.vivasf.com.br para compatibilidade iOS Safari", () => {
    const req = {
      protocol: "https",
      headers: {
        host: "api.conecta.vivasf.com.br",
        "x-forwarded-proto": "https",
      },
    };
    const opts = getCookieOptions(req as any, 3600);
    assert.equal(opts.sameSite, "lax");
    assert.equal(opts.secure, true);
    assert.equal(opts.domain, ".vivasf.com.br");
    assert.equal(opts.httpOnly, true);
  });
});
