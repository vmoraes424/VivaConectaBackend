import { FastifyInstance } from "fastify";
import { ParceirosService } from "./parceiros.service";
import {
  parceiroInputSchema,
  parceirosQuerySchema,
  excluirEmMassaSchema,
} from "./parceiros.schemas";
import { authenticate, requireArea } from "../../middlewares/auth";

export async function parceirosRoutes(app: FastifyInstance) {
  const service = new ParceirosService();

  // Listar parceiros (com filtros e dados agregados)
  app.get("/", { preHandler: [authenticate] }, async (request, reply) => {
    const query = parceirosQuerySchema.parse(request.query);
    const list = await service.listar(query);
    return reply.send(list);
  });

  // Obter detalhes de um parceiro
  app.get("/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parceiro = await service.obterPorId(id);
    if (!parceiro) {
      return reply.status(404).send({ message: "Parceiro não encontrado" });
    }
    return reply.send(parceiro);
  });

  // Criar ou atualizar parceiro
  app.post(
    "/",
    { preHandler: [requireArea("parceiros")] },
    async (request, reply) => {
      const body = parceiroInputSchema.parse(request.body);
      const parceiro = await service.salvar(body);
      return reply.status(201).send(parceiro);
    },
  );

  // Desativar parceiro
  app.patch(
    "/:id/desativar",
    { preHandler: [requireArea("parceiros")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await service.desativar(id);
      return reply.send({ success: true });
    },
  );

  // Excluir em massa
  app.delete(
    "/bulk",
    { preHandler: [requireArea("parceiros")] },
    async (request, reply) => {
      const body = excluirEmMassaSchema.parse(request.body);
      await service.excluirEmMassa(body.ids);
      return reply.send({ success: true });
    },
  );
}
