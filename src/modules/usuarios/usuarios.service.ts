import { db } from "../../db/index";
import { usuarios, type UsuarioRecord } from "../../db/schema/usuarios";
import { parceiros } from "../../db/schema/parceiros";
import { eq, ne, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { hashPassword } from "../../lib/password";
import { usuarioFormSchema, perfilSchema } from "./usuarios.schemas";
import { enviarConviteUsuario } from "../../lib/email";
import { z } from "zod";
import { deleteImageFromR2, uploadImageToR2, parseDataUrl } from "../../lib/r2";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors";

async function safeDeleteImage(
  url: string | null | undefined,
  ignoreUserId?: string,
  ignoreParceiroId?: string,
) {
  if (!url || url.startsWith("data:")) return;

  const [parceiro] = await db
    .select({ id: parceiros.id })
    .from(parceiros)
    .where(
      ignoreParceiroId
        ? and(eq(parceiros.avatarUrl, url), ne(parceiros.id, ignoreParceiroId))
        : eq(parceiros.avatarUrl, url),
    )
    .limit(1);

  if (parceiro) return;

  const [usuario] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(
      ignoreUserId
        ? and(eq(usuarios.avatarUrl, url), ne(usuarios.id, ignoreUserId))
        : eq(usuarios.avatarUrl, url),
    )
    .limit(1);

  if (usuario) return;

  await deleteImageFromR2(url);
}

export class UsuariosService {
  async listar() {
    const todosUsuarios = await db.select().from(usuarios);
    const todosParceiros = await db.select().from(parceiros);

    const sanitizados = todosUsuarios.map(({ senhaHash, ...u }) => ({
      ...u,
      avatarUrl: u.avatarUrl ?? undefined,
      telefone: u.telefone ?? undefined,
      localidade: u.localidade ?? undefined,
      parceiroId: u.parceiroId ?? undefined,
      conviteToken: u.conviteToken ?? undefined,
    }));

    const parceirosFormatados = todosParceiros.map((p) => ({
      ...p,
      empresa: p.empresa ?? undefined,
      avatarUrl: p.avatarUrl ?? undefined,
      localidade: p.localidade ?? undefined,
      comissao:
        p.comissaoTipo === "fixo"
          ? {
              tipo: "fixo" as const,
              valor: p.comissaoValor,
              moeda: (p.comissaoMoeda as "BRL" | "EUR" | "USD") || "BRL",
            }
          : {
              tipo: "percentual" as const,
              valor: p.comissaoValor,
            },
    }));

    return {
      usuarios: sanitizados,
      parceiros: parceirosFormatados,
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

    let avatarUrl = value.avatarUrl ? value.avatarUrl.trim() : null;
    if (avatarUrl && avatarUrl.startsWith("data:image/")) {
      const parsed = parseDataUrl(avatarUrl);
      if (parsed) {
        const uploaded = await uploadImageToR2(parsed.buffer, parsed.mimeType, "avatars");
        avatarUrl = uploaded.url;
      }
    }

    const papel = value.tipo === "parceiro" ? "parceiro" : "admin";
    const perfil = value.tipo === "editor" ? "editor" : "administrador";
    const acessos = value.tipo === "editor" ? value.acessos : [];
    const parceiroId = value.tipo === "parceiro" ? value.parceiroId : null;

    if (id && previous) {
      if (previous.avatarUrl && previous.avatarUrl !== avatarUrl) {
        await safeDeleteImage(previous.avatarUrl, id);
      }

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
          avatarUrl: avatarUrl || null,
        })
        .where(eq(usuarios.id, id));

      if (value.tipo === "parceiro" && value.parceiroId && avatarUrl) {
        const [parceiro] = await db
          .select()
          .from(parceiros)
          .where(eq(parceiros.id, value.parceiroId))
          .limit(1);

        if (parceiro && (!parceiro.avatarUrl || !parceiro.avatarUrl.trim())) {
          await db
            .update(parceiros)
            .set({ avatarUrl })
            .where(eq(parceiros.id, value.parceiroId));
        }
      }

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
      avatarUrl: avatarUrl || null,
    });

    // Se for usuário de parceiro e tiver foto, repassa para o parceiro caso ele não tenha foto
    if (value.tipo === "parceiro" && value.parceiroId && avatarUrl) {
      const [parceiro] = await db
        .select()
        .from(parceiros)
        .where(eq(parceiros.id, value.parceiroId))
        .limit(1);

      if (parceiro && (!parceiro.avatarUrl || !parceiro.avatarUrl.trim())) {
        await db
          .update(parceiros)
          .set({ avatarUrl })
          .where(eq(parceiros.id, value.parceiroId));
      }
    }

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

    const [found] = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1);
    if (!found) {
      throw new NotFoundError("Usuário não encontrado.");
    }

    await db.delete(usuarios).where(eq(usuarios.id, id));

    // Excluir foto do usuário armazenada no Cloudflare R2 (se não estiver em uso)
    if (found.avatarUrl) {
      await safeDeleteImage(found.avatarUrl, id);
    }

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

    const [atual] = await db
      .select({ avatarUrl: usuarios.avatarUrl })
      .from(usuarios)
      .where(eq(usuarios.id, actor.id))
      .limit(1);

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

    // Se o avatar foi alterado ou removido, excluir foto antiga do R2 se não estiver em uso
    if (atual?.avatarUrl && atual.avatarUrl !== value.avatarUrl) {
      await safeDeleteImage(atual.avatarUrl, actor.id);
    }

    const [updated] = await db.select().from(usuarios).where(eq(usuarios.id, actor.id)).limit(1);
    const { senhaHash, ...sanitized } = updated!;
    return sanitized;
  }
}
