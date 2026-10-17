import { FastifyInstance } from "fastify";
import { ResumoService } from "./resumo.service";
import { requireArea } from "../../middlewares/auth";
import { z } from "zod";

const resumoQuerySchema = z.object({
  periodo: z.enum(["7", "30", "90"]).optional().default("30"),
});

export async function resumoRoutes(app: FastifyInstance) {
  const service = new ResumoService();

  // Obter visão geral administrativa
  app.get(
    "/",
    { preHandler: [requireArea("visao-geral")] },
    async (request, reply) => {
      const query = resumoQuerySchema.parse(request.query);
      const data = await service.obterResumo(query.periodo);
      return reply.send(data);
    },
  );
}
