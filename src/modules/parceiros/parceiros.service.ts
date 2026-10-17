import { db } from "../../db/index";
import { parceiros } from "../../db/schema/parceiros";
import { especialidades } from "../../db/schema/especialidades";
import { indicacoes } from "../../db/schema/indicacoes";
import { acessos } from "../../db/schema/acessos";
import { usuarios } from "../../db/schema/usuarios";
import { eq, inArray, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { normalizar } from "../../lib/conecta";
import { parceiroInputSchema, type parceirosQuerySchema } from "./parceiros.schemas";
import { z } from "zod";
import { BadRequestError, NotFoundError } from "../../shared/errors";

export class ParceirosService {
  async listar(filters?: z.infer<typeof parceirosQuerySchema>) {
    const todosParceiros = await db
      .select({
        parceiro: parceiros,
        especialidadeNome: especialidades.nome,
      })
      .from(parceiros)
      .leftJoin(especialidades, eq(parceiros.especialidadeId, especialidades.id))
      .orderBy(desc(parceiros.criadoEm));

    const todasIndicacoes = await db.select().from(indicacoes);
    const todosAcessos = await db.select().from(acessos);

    const cliquesPorIndicacao = new Map<string, number>();
    for (const a of todosAcessos) {
      cliquesPorIndicacao.set(a.indicacaoId, (cliquesPorIndicacao.get(a.indicacaoId) || 0) + 1);
    }

    const indicacoesPorParceiro = new Map<string, number>();
    const acessadasPorParceiro = new Map<string, number>();

    for (const ind of todasIndicacoes) {
      indicacoesPorParceiro.set(
        ind.parceiroId,
        (indicacoesPorParceiro.get(ind.parceiroId) || 0) + 1,
      );
      if ((cliquesPorIndicacao.get(ind.id) || 0) > 0) {
        acessadasPorParceiro.set(
          ind.parceiroId,
          (acessadasPorParceiro.get(ind.parceiroId) || 0) + 1,
        );
      }
    }

    let items = todosParceiros.map(({ parceiro, especialidadeNome }) => ({
      ...parceiro,
      comissao:
        parceiro.comissaoTipo === "fixo"
          ? {
              tipo: "fixo" as const,
              valor: parceiro.comissaoValor,
              moeda: (parceiro.comissaoMoeda as "BRL" | "EUR" | "USD") || "BRL",
            }
          : {
              tipo: "percentual" as const,
              valor: parceiro.comissaoValor,
            },
      especialidade: especialidadeNome || "",
      indicacoes: indicacoesPorParceiro.get(parceiro.id) || 0,
      acessadas: acessadasPorParceiro.get(parceiro.id) || 0,
    }));

    if (filters?.q) {
      const qNorm = normalizar(filters.q);
      items = items.filter(
        (p) =>
          normalizar(p.nome).includes(qNorm) ||
          normalizar(p.empresa || "").includes(qNorm) ||
          normalizar(p.email).includes(qNorm) ||
          normalizar(p.especialidade).includes(qNorm),
      );
    }

    if (filters?.especialidade && filters.especialidade !== "todas") {
      items = items.filter((p) => p.especialidadeId === filters.especialidade);
    }

    if (filters?.status && filters.status !== "todos") {
      const wantActive = filters.status === "ativo";
      items = items.filter((p) => p.ativo === wantActive);
    }

    return items;
  }

  async obterPorId(id: string) {
    const [row] = await db
      .select({
        parceiro: parceiros,
        especialidadeNome: especialidades.nome,
      })
      .from(parceiros)
      .leftJoin(especialidades, eq(parceiros.especialidadeId, especialidades.id))
      .where(eq(parceiros.id, id))
      .limit(1);

    if (!row) return null;

    return {
      ...row.parceiro,
      comissao:
        row.parceiro.comissaoTipo === "fixo"
          ? {
              tipo: "fixo" as const,
              valor: row.parceiro.comissaoValor,
              moeda: (row.parceiro.comissaoMoeda as "BRL" | "EUR" | "USD") || "BRL",
            }
          : {
              tipo: "percentual" as const,
              valor: row.parceiro.comissaoValor,
            },
      especialidade: row.especialidadeNome || "",
    };
  }

  async salvar(input: z.infer<typeof parceiroInputSchema>) {
    const value = parceiroInputSchema.parse(input);

    const [especialidade] = await db
      .select()
      .from(especialidades)
      .where(eq(especialidades.id, value.especialidadeId))
      .limit(1);

    if (!especialidade) {
      throw new BadRequestError("Esta especialidade não está disponível. Selecione outra.");
    }

    const id = value.id || randomUUID();
    const comissaoTipo = value.comissao.tipo;
    const comissaoValor = value.comissao.valor;
    const comissaoMoeda = value.comissao.tipo === "fixo" ? value.comissao.moeda : null;

    const [existente] = await db
      .select()
      .from(parceiros)
      .where(eq(parceiros.id, id))
      .limit(1);

    if (existente) {
      await db
        .update(parceiros)
        .set({
          nome: value.nome,
          empresa: value.empresa || null,
          avatarUrl: value.avatarUrl || null,
          localidade: value.localidade || null,
          especialidadeId: value.especialidadeId,
          descricao: value.descricao || "",
          email: value.email,
          whatsapp: value.whatsapp,
          comissaoTipo,
          comissaoValor,
          comissaoMoeda,
          ativo: value.ativo,
        })
        .where(eq(parceiros.id, id));
    } else {
      await db.insert(parceiros).values({
        id,
        nome: value.nome,
        empresa: value.empresa || null,
        avatarUrl: value.avatarUrl || null,
        localidade: value.localidade || null,
        especialidadeId: value.especialidadeId,
        descricao: value.descricao || "",
        email: value.email,
        whatsapp: value.whatsapp,
        comissaoTipo,
        comissaoValor,
        comissaoMoeda,
        ativo: value.ativo,
      });
    }

    return this.obterPorId(id);
  }

  async desativar(id: string) {
    const [existente] = await db
      .select()
      .from(parceiros)
      .where(eq(parceiros.id, id))
      .limit(1);

    if (!existente) {
      throw new NotFoundError("Parceiro não encontrado.");
    }

    await db.update(parceiros).set({ ativo: false }).where(eq(parceiros.id, id));
    return { success: true };
  }

  async excluirEmMassa(ids: string[]) {
    if (!ids.length) return { success: true };

    // 1. Obter todas as indicações dos parceiros selecionados
    const indicacoesDoParceiro = await db
      .select({ id: indicacoes.id })
      .from(indicacoes)
      .where(inArray(indicacoes.parceiroId, ids));

    const indicacaoIds = indicacoesDoParceiro.map((i) => i.id);

    // 2. Excluir acessos
    if (indicacaoIds.length > 0) {
      await db.delete(acessos).where(inArray(acessos.indicacaoId, indicacaoIds));
    }

    // 3. Excluir indicações
    if (indicacaoIds.length > 0) {
      await db.delete(indicacoes).where(inArray(indicacoes.id, indicacaoIds));
    }

    // 4. Excluir contas de usuários vinculadas
    await db.delete(usuarios).where(inArray(usuarios.parceiroId, ids));

    // 5. Excluir parceiros
    await db.delete(parceiros).where(inArray(parceiros.id, ids));

    return { success: true };
  }
}
