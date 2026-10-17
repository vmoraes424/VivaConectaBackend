import { FastifyInstance } from "fastify";
import { IndicacoesService } from "./indicacoes.service";
import {
  indicacaoFormSchema,
  indicacoesQuerySchema,
  excluirIndicacoesSchema,
} from "./indicacoes.schemas";
import { authenticate, requireArea } from "../../middlewares/auth";

export async function indicacoesRoutes(app: FastifyInstance) {
  const service = new IndicacoesService();

  // Listar indicações com filtros
  app.get("/", { preHandler: [authenticate] }, async (request, reply) => {
    const query = indicacoesQuerySchema.parse(request.query);
    const result = await service.listar(query);
    return reply.send(result);
  });

  // Obter detalhes por código
  app.get("/:codigo", { preHandler: [authenticate] }, async (request, reply) => {
    const { codigo } = request.params as { codigo: string };
    const ind = await service.obterPorCodigo(codigo);
    if (!ind) {
      return reply.status(404).send({ message: "Indicação não encontrada" });
    }
    return reply.send(ind);
  });

  // Criar nova indicação
  app.post(
    "/",
    { preHandler: [requireArea("indicacoes")] },
    async (request, reply) => {
      const body = indicacaoFormSchema.parse(request.body);
      const ind = await service.criar(body, request.currentUser?.nome || "Equipe Viva SF");
      return reply.status(201).send(ind);
    },
  );

  // Excluir em massa
  app.delete(
    "/bulk",
    { preHandler: [requireArea("indicacoes")] },
    async (request, reply) => {
      const body = excluirIndicacoesSchema.parse(request.body);
      await service.excluirEmMassa(body.ids);
      return reply.send({ success: true });
    },
  );
}
