import { db } from "../../db/index";
import { usuarios, type UsuarioRecord } from "../../db/schema/usuarios";
import { parceiros } from "../../db/schema/parceiros";
import { eq, ne, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { hashPassword } from "../../lib/password";
import { usuarioFormSchema, perfilSchema } from "./usuarios.schemas";
import { enviarConviteUsuario } from "../../lib/email";
import { z } from "zod";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors";

export class UsuariosService {
  async listar() {
    const todosUsuarios = await db.select().from(usuarios);
    const todosParceiros = await db.select().from(parceiros);

    const sanitizados = todosUsuarios.map(({ senhaHash, ...u }) => u);
    return {
      usuarios: sanitizados,
      parceiros: todosParceiros,
    };
  }

  async salvar(input: z.infer<typeof usuarioFormSchema>, actor: UsuarioRecord, id?: string) {
    const value = usuarioFormSchema.parse(input);

    let previous: UsuarioRecord | undefined;
    if (id) {
      const [found] = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1);
      if (!found) throw new NotFoundError("Usuário não encontrado.");
      previous = found;
    }

    // Regra: Não pode desativar ou alterar o próprio acesso de administrador
    if (id === actor.id && (!value.ativo || value.tipo !== "administrador")) {
      throw new ForbiddenError("Você não pode desativar ou alterar o próprio acesso de administrador.");
    }

    // Regra: Email único
    const [existente] = await db
      .select()
      .from(usuarios)
      .where(
        id
          ? and(eq(usuarios.email, value.email), ne(usuarios.id, id))
          : eq(usuarios.email, value.email),
      )
      .limit(1);

    if (existente) {
      throw new ConflictError("Já existe um usuário com esse e-mail.");
    }

    // Regra: Se tipo parceiro, verifica parceiro e unicidade de conta
    if (value.tipo === "parceiro") {
      const [parceiro] = await db
        .select()
        .from(parceiros)
        .where(eq(parceiros.id, value.parceiroId))
        .limit(1);

      if (!parceiro) {
        throw new NotFoundError("Parceiro não encontrado.");
      }

      const [outroUsuarioParceiro] = await db
        .select()
        .from(usuarios)
        .where(
          id
            ? and(eq(usuarios.parceiroId, value.parceiroId), ne(usuarios.id, id))
            : eq(usuarios.parceiroId, value.parceiroId),
        )
        .limit(1);

      if (outroUsuarioParceiro) {
        throw new ConflictError("Esse parceiro já tem uma conta.");
      }
    }

    const papel = value.tipo === "parceiro" ? "parceiro" : "admin";
    const perfil = value.tipo === "editor" ? "editor" : "administrador";
    const acessos = value.tipo === "editor" ? value.acessos : [];
    const parceiroId = value.tipo === "parceiro" ? value.parceiroId : null;

    if (id && previous) {
      await db
        .update(usuarios)
        .set({
          nome: value.nome,
          email: value.email,
          papel,
          perfil,
          acessos,
          parceiroId,
          ativo: value.ativo,
        })
        .where(eq(usuarios.id, id));

      const [updated] = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1);
      const { senhaHash, ...sanitized } = updated!;
      return sanitized;
    }

    const userId = randomUUID();
    const conviteToken = randomUUID();
    const conviteExpiraEm = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 dias
    const temporaryHash = await hashPassword(randomUUID());

    await db.insert(usuarios).values({
      id: userId,
      nome: value.nome,
      email: value.email,
      senhaHash: temporaryHash,
      papel,
      perfil,
      acessos,
      parceiroId,
      ativo: value.ativo,
      convitePendente: true,
      conviteToken,
      conviteExpiraEm,
    });

    const [created] = await db.select().from(usuarios).where(eq(usuarios.id, userId)).limit(1);

    await enviarConviteUsuario({
      email: value.email,
      nome: value.nome,
      token: conviteToken,
      tipo: value.tipo,
    });

    const { senhaHash, ...sanitized } = created!;
    return sanitized;
  }

  async renovarConvite(id: string) {
    const [user] = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1);

    if (!user || !user.convitePendente || !user.ativo) {
      throw new BadRequestError("Este usuário não tem um convite pendente ativo.");
    }

    const novoToken = randomUUID();
    const novaValidade = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    await db
      .update(usuarios)
      .set({
        conviteToken: novoToken,
        conviteExpiraEm: novaValidade,
      })
      .where(eq(usuarios.id, id));

    const tipo: "administrador" | "editor" | "parceiro" =
      user.papel === "parceiro" ? "parceiro" : user.perfil === "editor" ? "editor" : "administrador";

    await enviarConviteUsuario({
      email: user.email,
      nome: user.nome,
      token: novoToken,
      tipo,
    });

    const [updated] = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1);
    const { senhaHash, ...sanitized } = updated!;
    return sanitized;
  }

  async excluir(id: string, actor: UsuarioRecord) {
    if (actor.id === id) {
      throw new ForbiddenError("Você não pode excluir a própria conta.");
    }

    await db.delete(usuarios).where(eq(usuarios.id, id));
    return { success: true };
  }

  async salvarPerfil(input: z.infer<typeof perfilSchema>, actor: UsuarioRecord) {
    const value = perfilSchema.parse(input);

    const [existente] = await db
      .select()
      .from(usuarios)
      .where(and(eq(usuarios.email, value.email), ne(usuarios.id, actor.id)))
      .limit(1);

    if (existente) {
      throw new ConflictError("Já existe um usuário com esse e-mail.");
    }

    await db
      .update(usuarios)
      .set({
        nome: value.nome,
        email: value.email,
        telefone: value.telefone || null,
        localidade: value.localidade || null,
        avatarUrl: value.avatarUrl || null,
      })
      .where(eq(usuarios.id, actor.id));

    const [updated] = await db.select().from(usuarios).where(eq(usuarios.id, actor.id)).limit(1);
    const { senhaHash, ...sanitized } = updated!;
    return sanitized;
  }
}
