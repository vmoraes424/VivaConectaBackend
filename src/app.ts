import fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { ZodError } from "zod";
import { env } from "./config/env";
import { AppError, ForbiddenError } from "./shared/errors";

import { authRoutes } from "./modules/auth/auth.routes";
import { usuariosRoutes } from "./modules/usuarios/usuarios.routes";
import { especialidadesRoutes } from "./modules/especialidades/especialidades.routes";
import { parceirosRoutes } from "./modules/parceiros/parceiros.routes";
import { indicacoesRoutes } from "./modules/indicacoes/indicacoes.routes";
import { parceiroDashboardRoutes } from "./modules/parceiro-dashboard/parceiro-dashboard.routes";
import { resumoRoutes } from "./modules/resumo/resumo.routes";
import { uploadRoutes } from "./modules/upload/upload.routes";
import { publicoRoutes, publicoAtalhosRoutes } from "./modules/publico/publico.routes";

export function buildApp(): FastifyInstance {
  const app = fastify({
    logger: env.NODE_ENV !== "test",
    trustProxy: true,
  });

  // Tolerância a requisições com Content-Type application/json e corpo vazio (ex: DELETE, POST sem payload)
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => {
      if (!body || (typeof body === "string" && body.trim() === "") || (Buffer.isBuffer(body) && body.length === 0)) {
        done(null, undefined);
        return;
      }
      try {
        const text = typeof body === "string" ? body : body.toString("utf-8");
        done(null, JSON.parse(text));
      } catch (err: any) {
        err.statusCode = 400;
        done(err, undefined);
      }
    },
  );

  // 1. CORS com lista explícita de origens
  const allowedOrigins = new Set<string>(
    env.FRONTEND_URL.split(",")
      .map((url) => url.trim().replace(/\/$/, ""))
      .filter(Boolean),
  );

  if (env.NODE_ENV !== "production") {
    allowedOrigins.add("http://localhost:3000");
    allowedOrigins.add("http://localhost:3001");
    allowedOrigins.add("http://localhost:3002");
    allowedOrigins.add("http://localhost:5173");
    allowedOrigins.add("http://localhost:5174");
    allowedOrigins.add("http://127.0.0.1:3000");
    allowedOrigins.add("http://127.0.0.1:3001");
    allowedOrigins.add("http://127.0.0.1:3002");
    allowedOrigins.add("http://127.0.0.1:5173");
    allowedOrigins.add("http://127.0.0.1:5174");
  }

  app.register(cors, {
    origin: (origin, cb) => {
      // Sem origin: curl, mobile, server-to-server
      if (!origin) {
        return cb(null, true);
      }
      const cleanOrigin = origin.trim().replace(/\/$/, "");
      if (allowedOrigins.has(cleanOrigin)) {
        return cb(null, true);
      }
      cb(new ForbiddenError("Origem não permitida"), false);
    },
    credentials: true,
  });

  // 4. Helmet (headers de segurança)
  app.register(helmet);

  // 5. Rate limit global
  app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: "1 minute",
  });

  // 7. Cookies
  app.register(cookie, {
    secret: env.COOKIE_SECRET,
    hook: "onRequest",
  });

  // 7. JWT
  app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: "token",
      signed: false,
    },
    sign: {
      expiresIn: "15m",
    },
  });

  // 8. Multipart (Upload de arquivos)
  app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 1,                  // 1 arquivo por requisição
      fields: 10,
      parts: 12,
    },
  });

  // Health check
  app.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Rotas da API
  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(usuariosRoutes, { prefix: "/api/usuarios" });
  app.register(especialidadesRoutes, { prefix: "/api/especialidades" });
  app.register(parceirosRoutes, { prefix: "/api/parceiros" });
  app.register(indicacoesRoutes, { prefix: "/api/indicacoes" });
  app.register(parceiroDashboardRoutes, { prefix: "/api/parceiro" });
  app.register(resumoRoutes, { prefix: "/api/resumo" });
  app.register(uploadRoutes, { prefix: "/api/upload" });
  // 6. publicoRoutes sob /api/publico e atalhos curtos /i/:codigo na raiz
  app.register(publicoRoutes, { prefix: "/api/publico" });
  app.register(publicoAtalhosRoutes);

  // 2 e 3. Tratamento global de erros
  app.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    // 1. Validação (Zod)
    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: error.issues[0]?.message || "Dados inválidos.",
        errors: error.issues,
      });
    }

    // 2. Erros de negócio conhecidos
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ message: error.message });
    }

    // 3. Erros do próprio Fastify/plugins que já trazem statusCode
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send({ message: error.message });
    }

    // 4. Qualquer outra coisa = bug/infra: loga tudo, devolve genérico
    request.log.error({ err: error }, "Erro não tratado");
    return reply.status(500).send({ message: "Erro interno do servidor." });
  });

  return app;
}
