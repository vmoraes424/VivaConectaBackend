import { FastifyInstance } from "fastify";
import { AuthService } from "./auth.service";
import {
  loginBodySchema,
  recuperarSenhaBodySchema,
  novaSenhaBodySchema,
  aceitarConviteBodySchema,
} from "./auth.schemas";
import { authenticate } from "../../middlewares/auth";
import { env } from "../../config/env";

export async function authRoutes(app: FastifyInstance) {
  const service = new AuthService();

  // Login
  app.post(
    "/login",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const body = loginBodySchema.parse(request.body);
      const user = await service.login(body);

      const token = app.jwt.sign(
        {
          id: user.id,
          email: user.email,
          papel: user.papel,
          perfil: user.perfil,
        },
        {
          expiresIn: body.lembrar ? "30d" : "1d",
        },
      );

      reply.setCookie("token", token, {
        path: "/",
        httpOnly: true,
        secure:
          env.NODE_ENV === "production" &&
          !request.headers.host?.includes("localhost") &&
          !request.headers.host?.includes("127.0.0.1"),
        sameSite: "lax",
        maxAge: body.lembrar ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
      });

      return reply.send({ user, token });
    });

  // Logout
  app.post("/logout", async (_request, reply) => {
    reply.clearCookie("token", { path: "/" });
    return reply.send({ success: true });
  });

  // Me (current authenticated user)
  app.get("/me", { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.currentUser!;
    const { senhaHash, ...sanitized } = user;
    return reply.send({ user: sanitized });
  });

  // Recuperar senha
  app.post(
    "/recuperar-senha",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const body = recuperarSenhaBodySchema.parse(request.body);
      const token = await service.recuperarSenha(body.email);
      return reply.send({
        message: "Se o e-mail estiver cadastrado, as instruções foram enviadas.",
        token,
      });
    });

  // Validar token de recuperação
  app.get("/reset/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const valid = await service.validarResetToken(token);
    return reply.send({ valid });
  });

  // Nova senha
  app.post(
    "/nova-senha",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const body = novaSenhaBodySchema.parse(request.body);
      await service.novaSenha(body);
      return reply.send({ success: true, message: "Senha redefinida com sucesso." });
    });

  // Obter convite
  app.get("/convite/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const user = await service.obterConvite(token);
    return reply.send({ user });
  });

  // Aceitar convite
  app.post(
    "/aceitar-convite",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      const body = aceitarConviteBodySchema.parse(request.body);
      const user = await service.aceitarConvite(body);

      const token = app.jwt.sign(
        {
          id: user.id,
          email: user.email,
          papel: user.papel,
          perfil: user.perfil,
        },
        { expiresIn: "1d" },
      );

      reply.setCookie("token", token, {
        path: "/",
        httpOnly: true,
        secure:
          env.NODE_ENV === "production" &&
          !request.headers.host?.includes("localhost") &&
          !request.headers.host?.includes("127.0.0.1"),
        sameSite: "lax",
        maxAge: 24 * 60 * 60,
      });

      return reply.send({ user, token });
    });
}
