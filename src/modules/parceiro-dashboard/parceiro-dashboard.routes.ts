import { FastifyInstance } from "fastify";
import { ParceiroDashboardService } from "./parceiro-dashboard.service";
import { requireParceiro } from "../../middlewares/auth";
import { z } from "zod";

const parceiroQuerySchema = z.object({
  status: z.enum(["acessado", "aguardando"]).optional(),
});

export async function parceiroDashboardRoutes(app: FastifyInstance) {
  const service = new ParceiroDashboardService();

  // Dashboard do parceiro logado
  app.get(
    "/me",
    { preHandler: [requireParceiro] },
    async (request, reply) => {
      const query = parceiroQuerySchema.parse(request.query);
      const parceiroId = request.currentUser!.parceiroId!;
      const data = await service.obterDashboard(parceiroId, query.status);
      return reply.send(data);
    },
  );

  // Consulta por id (para admins ou pelo parceiro)
  app.get(
    "/:id",
    { preHandler: [requireParceiro] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.currentUser!;

      // Se for papel parceiro, só pode ver seu próprio parceiroId
      if (user.papel === "parceiro" && user.parceiroId !== id) {
        return reply.status(403).send({ message: "Acesso restrito ao próprio parceiro." });
      }

      const query = parceiroQuerySchema.parse(request.query);
      const data = await service.obterDashboard(id, query.status);
      return reply.send(data);
    },
  );
}
