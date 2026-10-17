import { db } from "../../db/index";
import { indicacoes } from "../../db/schema/indicacoes";
import { parceiros } from "../../db/schema/parceiros";
import { especialidades } from "../../db/schema/especialidades";
import { acessos } from "../../db/schema/acessos";
import { eq, desc } from "drizzle-orm";

export class ResumoService {
  async obterResumo(periodoStr = "30") {
    const periodo = Number(periodoStr);
    const since = Date.now() - periodo * 86400000;

    const todosParceiros = await db
      .select({
        parceiro: parceiros,
        especialidadeNome: especialidades.nome,
      })
      .from(parceiros)
      .leftJoin(especialidades, eq(parceiros.especialidadeId, especialidades.id));

    const todasIndicacoes = await db
      .select({
        indicacao: indicacoes,
        parceiro: parceiros,
      })
      .from(indicacoes)
      .innerJoin(parceiros, eq(indicacoes.parceiroId, parceiros.id))
      .orderBy(desc(indicacoes.criadaEm));

    const todosAcessos = await db.select().from(acessos).orderBy(desc(acessos.em));

    // Filtra pelo período
    const items = todasIndicacoes
      .filter((row) => new Date(row.indicacao.criadaEm).getTime() >= since)
      .map((row) => {
        const indAcessos = todosAcessos.filter((a) => a.indicacaoId === row.indicacao.id);
        const cliques = indAcessos.length;
        const unicos = new Set(indAcessos.map((a) => a.visitanteId)).size;
        return {
          ...row.indicacao,
          parceiro: row.parceiro,
          cliente: {
            nome: row.indicacao.clienteNome,
            whatsapp: row.indicacao.clienteWhatsapp,
            email: row.indicacao.clienteEmail || "",
          },
          acessos: indAcessos,
          cliques,
          unicos,
          status: cliques > 0 ? ("acessado" as const) : ("aguardando" as const),
        };
      });

    const itemIds = new Set(items.map((i) => i.id));
    const accessesInPeriod = todosAcessos.filter(
      (a) => itemIds.has(a.indicacaoId) && new Date(a.em).getTime() >= since,
    );

    const partners = todosParceiros.map(({ parceiro, especialidadeNome }) => {
      const rows = items.filter((i) => i.parceiroId === parceiro.id);
      return {
        ...parceiro,
        especialidade: especialidadeNome || "",
        total: rows.length,
        acessadas: rows.filter((i) => i.cliques > 0).length,
        cliques: rows.reduce((n, i) => n + i.cliques, 0),
      };
    });

    const activity = [
      ...items.map((i) => ({
        id: i.id,
        em: i.criadaEm,
        title: `Indicação criada para ${i.cliente.nome}`,
        description: `${i.codigo} · ${i.parceiro.nome}`,
        codigo: i.codigo,
        tipo: "indicacao" as const,
      })),
      ...accessesInPeriod.map((a) => {
        const i = items.find((ind) => ind.id === a.indicacaoId)!;
        return {
          id: a.id,
          em: a.em,
          title: `${i?.cliente?.nome || "Cliente"} acessou o link`,
          description: `${i?.codigo || ""} · ${i?.parceiro?.nome || ""} · ${a.cidade}, ${a.uf}`,
          codigo: i?.codigo || "",
          tipo: "acesso" as const,
        };
      }),
    ]
      .sort((a, b) => new Date(b.em).getTime() - new Date(a.em).getTime())
      .slice(0, 5);

    const waiting = items
      .filter(
        (i) =>
          !i.cliques &&
          new Date(i.criadaEm).getTime() < Date.now() - 2 * 86400000,
      )
      .slice(0, 3);

    return {
      ativos: todosParceiros.filter((p) => p.parceiro.ativo).length,
      cadastrados: todosParceiros.length,
      total: items.length,
      acessadas: items.filter((i) => i.cliques > 0).length,
      cliques: accessesInPeriod.length,
      unicos: new Set(accessesInPeriod.map((a) => a.visitanteId)).size,
      partners,
      waiting,
      activity,
    };
  }
}
