import { FastifyInstance } from "fastify";
import { requireParceiro } from "../../middlewares/auth";
import { env } from "../../config/env";

// Cadastro do parceiro como profissional do Viva SF: os dados ficam no backend do Viva SF,
// aqui só há a ponte autenticada (chave de serviço + e-mail da sessão do parceiro).
async function vivasf(method: "GET" | "PUT", email: string, body?: unknown) {
  if (!env.VIVASF_API_URL || !env.VIVASF_SERVICE_KEY) {
    return { status: 503, data: { message: "Integração com o Viva SF não configurada." } };
  }
  try {
    const res = await fetch(
      `${env.VIVASF_API_URL.replace(/\/$/, "")}/integracoes/conecta/profissional?email=${encodeURIComponent(email)}`,
      {
        method,
        headers: {
          "x-service-key": env.VIVASF_SERVICE_KEY,
          ...(body ? { "content-type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10_000),
      },
    );
    return { status: res.status, data: await res.json().catch(() => ({})) };
  } catch {
    return { status: 502, data: { message: "Não foi possível falar com o Viva SF. Tente de novo." } };
  }
}

export async function cadastroRoutes(app: FastifyInstance) {
  // Perfil e andamento do cadastro (404 = ainda não enviou)
  app.get("/", { preHandler: [requireParceiro] }, async (request, reply) => {
    const { status, data } = await vivasf("GET", request.currentUser!.email);
    return reply.status(status).send(data);
  });

  // Edição: o Viva SF valida e manda as alterações para análise do admin
  app.put("/", { preHandler: [requireParceiro] }, async (request, reply) => {
    const { status, data } = await vivasf("PUT", request.currentUser!.email, request.body);
    return reply.status(status).send(data);
  });
}
