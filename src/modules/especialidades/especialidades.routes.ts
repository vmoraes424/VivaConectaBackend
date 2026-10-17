import { FastifyInstance } from "fastify";
import { EspecialidadesService } from "./especialidades.service";
import { especialidadeBodySchema } from "./especialidades.schemas";
import { authenticate, requireArea } from "../../middlewares/auth";

export async function especialidadesRoutes(app: FastifyInstance) {
  const service = new EspecialidadesService();

  // Listar especialidades (autenticado)
  app.get("/", { preHandler: [authenticate] }, async (_request, reply) => {
    const list = await service.listar();
    return reply.send(list);
  });

  // Criar especialidade
  app.post(
    "/",
    { preHandler: [requireArea("parceiros")] },
    async (request, reply) => {
      const body = especialidadeBodySchema.parse(request.body);
      const item = await service.criar(body.nome);
      return reply.status(201).send(item);
    },
  );

  // Atualizar especialidade
  app.put(
    "/:id",
    { preHandler: [requireArea("parceiros")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = especialidadeBodySchema.parse(request.body);
      const item = await service.atualizar(id, body.nome);
      return reply.send(item);
    },
  );

  // Excluir especialidade
  app.delete(
    "/:id",
    { preHandler: [requireArea("parceiros")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await service.excluir(id);
      return reply.send({ success: true });
    },
  );
}
