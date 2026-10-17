import { db } from "../../db/index";
import { usuarios } from "../../db/schema/usuarios";
import { recuperacoesSenha } from "../../db/schema/recuperacao-senha";
import { eq, and, gt } from "drizzle-orm";
import { comparePassword, hashPassword } from "../../lib/password";
import { randomUUID } from "node:crypto";
import { enviarRecuperacaoSenha } from "../../lib/email";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../../shared/errors";

export class AuthService {
  async login(input: { email: string; senha: string; lembrar?: boolean }) {
    const email = input.email.toLowerCase().trim();

    const [user] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, email))
      .limit(1);

    if (user?.bloqueadoAte && new Date(user.bloqueadoAte).getTime() > Date.now()) {
      throw new UnauthorizedError("Acesso bloqueado por 15 minutos. Tente mais tarde.");
    }

    const senhaCorreta = user ? await comparePassword(input.senha, user.senhaHash) : false;

    if (!user || !user.ativo || user.convitePendente || !senhaCorreta) {
      if (user) {
        const count = user.tentativasFalhas + 1;
        const bloqueadoAte = count >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        await db
          .update(usuarios)
          .set({
            tentativasFalhas: count,
            bloqueadoAte,
          })
          .where(eq(usuarios.id, user.id));

        if (count >= 5) {
          throw new UnauthorizedError("Acesso bloqueado por 15 minutos. Tente mais tarde.");
        }
        throw new UnauthorizedError(
          `E-mail ou senha incorretos. Confira e tente de novo. Restam ${5 - count} tentativas.`,
        );
      }
      throw new UnauthorizedError("E-mail ou senha incorretos. Confira e tente de novo.");
    }

    // Login com sucesso: reseta tentativas e atualiza último acesso
    const now = new Date();
    await db
      .update(usuarios)
      .set({
        tentativasFalhas: 0,
        bloqueadoAte: null,
        ultimoAcesso: now,
      })
      .where(eq(usuarios.id, user.id));

    const { senhaHash, ...sanitizedUser } = user;
    return { ...sanitizedUser, ultimoAcesso: now };
  }

  async recuperarSenha(emailRaw: string) {
    const email = emailRaw.toLowerCase().trim();
    const token = randomUUID();

    await db.delete(recuperacoesSenha).where(eq(recuperacoesSenha.email, email));

    const [user] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, email))
      .limit(1);

    if (user && user.ativo) {
      await db.insert(recuperacoesSenha).values({
        token,
        email,
        expiraEm: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
        usado: false,
      });

      await enviarRecuperacaoSenha({
        email,
        nome: user.nome,
        token,
      });
    }

    return token;
  }

  async validarResetToken(token: string) {
    const [reset] = await db
      .select()
      .from(recuperacoesSenha)
      .where(
        and(
          eq(recuperacoesSenha.token, token),
          eq(recuperacoesSenha.usado, false),
          gt(recuperacoesSenha.expiraEm, new Date()),
        ),
      )
      .limit(1);

    return Boolean(reset);
  }

  async novaSenha(input: { token: string; senha: string }) {
    const [reset] = await db
      .select()
      .from(recuperacoesSenha)
      .where(
        and(
          eq(recuperacoesSenha.token, input.token),
          eq(recuperacoesSenha.usado, false),
          gt(recuperacoesSenha.expiraEm, new Date()),
        ),
      )
      .limit(1);

    if (!reset) {
      throw new BadRequestError("Este link expirou. Solicite um novo link para recuperar sua senha.");
    }

    const [user] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, reset.email))
      .limit(1);

    if (!user) {
      throw new NotFoundError("Usuário não encontrado.");
    }

    const mesmaSenha = await comparePassword(input.senha, user.senhaHash);
    if (mesmaSenha) {
      throw new BadRequestError("Escolha uma senha que você ainda não usou aqui.");
    }

    const novaSenhaHash = await hashPassword(input.senha);

    await db
      .update(usuarios)
      .set({
        senhaHash: novaSenhaHash,
        tentativasFalhas: 0,
        bloqueadoAte: null,
      })
      .where(eq(usuarios.id, user.id));

    await db
      .update(recuperacoesSenha)
      .set({ usado: true })
      .where(eq(recuperacoesSenha.token, input.token));

    return { success: true };
  }

  async obterConvite(token: string) {
    const [user] = await db
      .select()
      .from(usuarios)
      .where(
        and(
          eq(usuarios.conviteToken, token),
          eq(usuarios.convitePendente, true),
          gt(usuarios.conviteExpiraEm, new Date()),
          eq(usuarios.ativo, true),
        ),
      )
      .limit(1);

    if (!user) {
      throw new BadRequestError("Este convite expirou ou não está disponível. Peça um novo à equipe da Viva SF.");
    }

    const { senhaHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  async aceitarConvite(input: { token: string; senha: string }) {
    const user = await this.obterConvite(input.token);

    const novaSenhaHash = await hashPassword(input.senha);
    const now = new Date();

    await db
      .update(usuarios)
      .set({
        senhaHash: novaSenhaHash,
        convitePendente: false,
        conviteToken: null,
        conviteExpiraEm: null,
        ultimoAcesso: now,
      })
      .where(eq(usuarios.id, user.id));

    const [updated] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, user.id))
      .limit(1);

    const { senhaHash, ...sanitizedUser } = updated!;
    return sanitizedUser;
  }
}
