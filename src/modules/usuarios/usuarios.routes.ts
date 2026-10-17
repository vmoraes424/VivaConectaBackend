import { FastifyInstance } from "fastify";
import { UsuariosService } from "./usuarios.service";
import { usuarioFormSchema, perfilSchema } from "./usuarios.schemas";
import {
  authenticate,
  requireAdministratorProfile,
} from "../../middlewares/auth";

export async function usuariosRoutes(app: FastifyInstance) {
  const service = new UsuariosService();

  // Listar usuários e parceiros (somente perfil administrador)
  app.get(
    "/",
    { preHandler: [requireAdministratorProfile] },
    async (_request, reply) => {
      const data = await service.listar();
      return reply.send(data);
    },
  );

  // Criar novo usuário
  app.post(
    "/",
    { preHandler: [requireAdministratorProfile] },
    async (request, reply) => {
      const body = usuarioFormSchema.parse(request.body);
      const user = await service.salvar(body, request.currentUser!);
      return reply.status(201).send({ user });
    },
  );

  // Editar usuário existente
  app.put(
    "/:id",
    { preHandler: [requireAdministratorProfile] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = usuarioFormSchema.parse(request.body);
      const user = await service.salvar(body, request.currentUser!, id);
      return reply.send({ user });
    },
  );

  // Renovar convite
  app.post(
    "/:id/renovar-convite",
    { preHandler: [requireAdministratorProfile] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = await service.renovarConvite(id);
      return reply.send({ user });
    },
  );

  // Excluir usuário
  app.delete(
    "/:id",
    { preHandler: [requireAdministratorProfile] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await service.excluir(id, request.currentUser!);
      return reply.send({ success: true });
    },
  );

  // Salvar próprio perfil (qualquer usuário logado)
  app.put(
    "/meu-perfil",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const body = perfilSchema.parse(request.body);
      const user = await service.salvarPerfil(body, request.currentUser!);
      return reply.send({ user });
    },
  );
}
