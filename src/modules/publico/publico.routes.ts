import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { PublicoService } from "./publico.service";
import { z } from "zod";
import { NotFoundError } from "../../shared/errors";
import { getCookieOptions } from "../../config/cookie";

const acessoBodySchema = z.object({
  visitanteId: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  origem: z.enum(["WhatsApp", "Navegador"]).optional(),
});

const service = new PublicoService();

const publicoRateLimit = {
  max: 20,
  timeWindow: "1 minute",
};

export async function validarCodigoHandler(
  request: FastifyRequest<{ Params: { codigo: string } }>,
  reply: FastifyReply,
) {
  const { codigo } = request.params;
  const result = await service.validarCodigo(codigo);
  if (!result) {
    throw new NotFoundError("Código de indicação inválido ou expirado.");
  }
  return reply.send(result);
}

export async function registrarAcessoHandler(
  request: FastifyRequest<{ Params: { codigo: string }; Body?: unknown }>,
  reply: FastifyReply,
) {
  const { codigo } = request.params;
  const body = acessoBodySchema.parse(request.body || {});

  const cookieVisitante = request.cookies["conecta-visitante"];
  const visitanteId = body.visitanteId || cookieVisitante;
  const userAgent = request.headers["user-agent"];

  const result = await service.registrarAcesso(codigo, {
    visitanteId,
    userAgent,
    cidade: body.cidade,
    uf: body.uf,
    origem: body.origem,
  });

  if (!result) {
    throw new NotFoundError("Código de indicação inválido ou expirado.");
  }

  // Persiste cookie de visitante caso não exista
  if (!cookieVisitante && result.visitanteId) {
    reply.setCookie(
      "conecta-visitante",
      result.visitanteId,
      getCookieOptions(request, 365 * 24 * 60 * 60),
    );
  }

  return reply.send(result);
}

export async function publicoRoutes(app: FastifyInstance) {
  app.get("/i/:codigo", { config: { rateLimit: publicoRateLimit } }, validarCodigoHandler);
  app.get("/indicacoes/:codigo", { config: { rateLimit: publicoRateLimit } }, validarCodigoHandler);
  app.post("/i/:codigo/acesso", { config: { rateLimit: publicoRateLimit } }, registrarAcessoHandler);
  app.post("/indicacoes/:codigo/acesso", { config: { rateLimit: publicoRateLimit } }, registrarAcessoHandler);
}

export async function publicoAtalhosRoutes(app: FastifyInstance) {
  app.get("/i/:codigo", { config: { rateLimit: publicoRateLimit } }, validarCodigoHandler);
  app.post("/i/:codigo/acesso", { config: { rateLimit: publicoRateLimit } }, registrarAcessoHandler);
}
