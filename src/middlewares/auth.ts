import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index";
import { usuarios, type UsuarioRecord } from "../db/schema/usuarios";
import { eq } from "drizzle-orm";

declare module "fastify" {
  interface FastifyRequest {
    currentUser?: UsuarioRecord;
  }
}

export type TokenPayload = {
  id: string;
  email: string;
  papel: "admin" | "parceiro";
  perfil: "administrador" | "editor";
};

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    let token = request.cookies.token;

    if (!token && request.headers.authorization) {
      const parts = request.headers.authorization.split(" ");
      if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
        token = parts[1];
      }
    }

    if (!token) {
      return reply.status(401).send({ message: "Não autorizado. Faça login para continuar." });
    }

    const payload = await request.server.jwt.verify<TokenPayload>(token);

    const [user] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, payload.id))
      .limit(1);

    if (!user || !user.ativo || user.convitePendente) {
      return reply.status(401).send({ message: "Sessão inválida ou usuário inativo." });
    }

    request.currentUser = user;
  } catch {
    return reply.status(401).send({ message: "Token inválido ou expirado." });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  if (reply.sent) return;

  if (request.currentUser?.papel !== "admin") {
    return reply.status(403).send({ message: "Acesso restrito a administradores." });
  }
}

export async function requireAdministratorProfile(request: FastifyRequest, reply: FastifyReply) {
  await requireAdmin(request, reply);
  if (reply.sent) return;

  if (request.currentUser?.perfil !== "administrador") {
    return reply.status(403).send({ message: "Somente administradores podem realizar esta ação." });
  }
}

export function requireArea(area: "visao-geral" | "parceiros" | "indicacoes") {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(request, reply);
    if (reply.sent) return;

    const user = request.currentUser!;
    if (user.perfil === "administrador") {
      return;
    }

    const acessos = (user.acessos as string[]) || [];
    if (!acessos.includes(area)) {
      return reply.status(403).send({ message: `Você não tem permissão para acessar a área de ${area}.` });
    }
  };
}

export async function requireParceiro(request: FastifyRequest, reply: FastifyReply) {
  await authenticate(request, reply);
  if (reply.sent) return;

  if (request.currentUser?.papel !== "parceiro" || !request.currentUser?.parceiroId) {
    return reply.status(403).send({ message: "Acesso restrito ao parceiro." });
  }
}
