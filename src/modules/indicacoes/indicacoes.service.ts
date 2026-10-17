import { db } from "../../db/index";
import { indicacoes } from "../../db/schema/indicacoes";
import { parceiros } from "../../db/schema/parceiros";
import { especialidades } from "../../db/schema/especialidades";
import { codigosEmitidos } from "../../db/schema/codigos-emitidos";
import { acessos } from "../../db/schema/acessos";
import { eq, inArray, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { normalizar, nextCode } from "../../lib/conecta";
import { indicacaoFormSchema, type indicacoesQuerySchema } from "./indicacoes.schemas";
import { z } from "zod";
import { BadRequestError } from "../../shared/errors";

export class IndicacoesService {
  async listar(filters?: z.infer<typeof indicacoesQuerySchema>) {
    const todasIndicacoes = await db
      .select({
        indicacao: indicacoes,
        parceiro: parceiros,
        especialidadeNome: especialidades.nome,
      })
      .from(indicacoes)
      .innerJoin(parceiros, eq(indicacoes.parceiroId, parceiros.id))
      .leftJoin(especialidades, eq(parceiros.especialidadeId, especialidades.id))
      .orderBy(desc(indicacoes.criadaEm));

    const todosAcessos = await db.select().from(acessos).orderBy(desc(acessos.em));

    const acessosPorIndicacao = new Map<string, typeof todosAcessos>();
    for (const a of todosAcessos) {
      const list = acessosPorIndicacao.get(a.indicacaoId) || [];
      list.push(a);
      acessosPorIndicacao.set(a.indicacaoId, list);
    }

    const all = todasIndicacoes.map(({ indicacao, parceiro, especialidadeNome }) => {
      const indAcessos = acessosPorIndicacao.get(indicacao.id) || [];
      const cliques = indAcessos.length;
      const unicos = new Set(indAcessos.map((a) => a.visitanteId)).size;
      const status = cliques > 0 ? ("acessado" as const) : ("aguardando" as const);
      const primeiroAcesso = indAcessos.length ? indAcessos[indAcessos.length - 1].em : undefined;
      const ultimoAcesso = indAcessos.length ? indAcessos[0].em : undefined;

      return {
        ...indicacao,
        cliente: {
          nome: indicacao.clienteNome,
          whatsapp: indicacao.clienteWhatsapp,
          email: indicacao.clienteEmail || "",
        },
        comissaoAcordada:
          indicacao.comissaoAcordadaTipo === "fixo"
            ? {
                tipo: "fixo" as const,
                valor: indicacao.comissaoAcordadaValor,
                moeda: (indicacao.comissaoAcordadaMoeda as "BRL" | "EUR" | "USD") || "BRL",
              }
            : {
                tipo: "percentual" as const,
                valor: indicacao.comissaoAcordadaValor,
              },
        parceiro: {
          ...parceiro,
          especialidade: especialidadeNome || "",
        },
        acessos: indAcessos,
        cliques,
        unicos,
        status,
        primeiroAcesso,
        ultimoAcesso,
      };
    });

    const now = Date.now();
    const base = all.filter((i) => {
      if (filters?.q) {
        const qNorm = normalizar(filters.q);
        const match = normalizar(
          `${i.codigo} ${i.cliente.nome} ${i.parceiro.nome}`,
        ).includes(qNorm);
        if (!match) return false;
      }

      if (filters?.parceiro && i.parceiroId !== filters.parceiro) {
        return false;
      }

      if (filters?.periodo && filters.periodo !== "todos") {
        const dias = Number(filters.periodo);
        if (new Date(i.criadaEm).getTime() < now - dias * 86400000) {
          return false;
        }
      }

      return true;
    });

    const counts = {
      todos: base.length,
      acessado: base.filter((i) => i.cliques > 0).length,
      aguardando: base.filter((i) => !i.cliques).length,
    };

    const items = base.filter(
      (i) => !filters?.status || filters.status === "todos" || i.status === filters.status,
    );

    return {
      items,
      counts,
    };
  }

  async obterPorCodigo(codigo: string) {
    const [row] = await db
      .select({
        indicacao: indicacoes,
        parceiro: parceiros,
        especialidadeNome: especialidades.nome,
      })
      .from(indicacoes)
      .innerJoin(parceiros, eq(indicacoes.parceiroId, parceiros.id))
      .leftJoin(especialidades, eq(parceiros.especialidadeId, especialidades.id))
      .where(eq(indicacoes.codigo, codigo))
      .limit(1);

    if (!row) return null;

    const indAcessos = await db
      .select()
      .from(acessos)
      .where(eq(acessos.indicacaoId, row.indicacao.id))
      .orderBy(desc(acessos.em));

    const cliques = indAcessos.length;
    const unicos = new Set(indAcessos.map((a) => a.visitanteId)).size;
    const status = cliques > 0 ? ("acessado" as const) : ("aguardando" as const);

    return {
      ...row.indicacao,
      cliente: {
        nome: row.indicacao.clienteNome,
        whatsapp: row.indicacao.clienteWhatsapp,
        email: row.indicacao.clienteEmail || "",
      },
      comissaoAcordada:
        row.indicacao.comissaoAcordadaTipo === "fixo"
          ? {
              tipo: "fixo" as const,
              valor: row.indicacao.comissaoAcordadaValor,
              moeda: (row.indicacao.comissaoAcordadaMoeda as "BRL" | "EUR" | "USD") || "BRL",
            }
          : {
              tipo: "percentual" as const,
              valor: row.indicacao.comissaoAcordadaValor,
            },
      parceiro: {
        ...row.parceiro,
        especialidade: row.especialidadeNome || "",
      },
      acessos: indAcessos,
      cliques,
      unicos,
      status,
      primeiroAcesso: indAcessos.length ? indAcessos[indAcessos.length - 1].em : undefined,
      ultimoAcesso: indAcessos.length ? indAcessos[0].em : undefined,
    };
  }

  async criar(input: z.infer<typeof indicacaoFormSchema>, criadaPorNome = "Equipe Viva SF") {
    const value = indicacaoFormSchema.parse(input);

    const [parceiro] = await db
      .select()
      .from(parceiros)
      .where(eq(parceiros.id, value.parceiroId))
      .limit(1);

    if (!parceiro || !parceiro.ativo) {
      throw new BadRequestError("Selecione um parceiro ativo");
    }

    // Carregar todos os códigos emitidos já registrados
    const codigosExistentes = await db.select({ codigo: codigosEmitidos.codigo }).from(codigosEmitidos);
    const setEmitidos = new Set(codigosExistentes.map((c) => c.codigo));

    const codigo = nextCode(setEmitidos);
    const id = randomUUID();
    const now = new Date();

    // 1. Grava no log de emitidos para nunca reaproveitar
    await db.insert(codigosEmitidos).values({
      codigo,
      emitidoEm: now,
    });

    // 2. Insere a indicação congelando a comissão do parceiro
    await db.insert(indicacoes).values({
      id,
      codigo,
      parceiroId: parceiro.id,
      clienteNome: value.cliente.nome,
      clienteWhatsapp: value.cliente.whatsapp,
      clienteEmail: value.cliente.email || null,
      servico: value.servico,
      observacao: value.observacao || "",
      autorizouCompartilhar: value.autorizouCompartilhar,
      comissaoAcordadaTipo: parceiro.comissaoTipo,
      comissaoAcordadaValor: parceiro.comissaoValor,
      comissaoAcordadaMoeda: parceiro.comissaoMoeda,
      criadaPor: criadaPorNome,
      criadaEm: now,
    });

    return this.obterPorCodigo(codigo);
  }

  async excluirEmMassa(ids: string[]) {
    if (!ids.length) return { success: true };

    // 1. Excluir acessos vinculados
    await db.delete(acessos).where(inArray(acessos.indicacaoId, ids));

    // 2. Excluir indicações (não remove de codigosEmitidos)
    await db.delete(indicacoes).where(inArray(indicacoes.id, ids));

    return { success: true };
  }
}
