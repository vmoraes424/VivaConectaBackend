import { db } from "../../db/index";
import { indicacoes } from "../../db/schema/indicacoes";
import { parceiros } from "../../db/schema/parceiros";
import { especialidades } from "../../db/schema/especialidades";
import { acessos } from "../../db/schema/acessos";
import { eq, desc } from "drizzle-orm";
import { NotFoundError } from "../../shared/errors";

export class ParceiroDashboardService {
  async obterDashboard(parceiroId: string, statusFilter?: "acessado" | "aguardando") {
    const [row] = await db
      .select({
        parceiro: parceiros,
        especialidadeNome: especialidades.nome,
      })
      .from(parceiros)
      .leftJoin(especialidades, eq(parceiros.especialidadeId, especialidades.id))
      .where(eq(parceiros.id, parceiroId))
      .limit(1);

    if (!row) {
      throw new NotFoundError("Parceiro não encontrado.");
    }

    const parceiroIndicacoes = await db
      .select()
      .from(indicacoes)
      .where(eq(indicacoes.parceiroId, parceiroId))
      .orderBy(desc(indicacoes.criadaEm));

    const indicacaoIds = new Set(parceiroIndicacoes.map((i) => i.id));
    const todosAcessos = await db.select().from(acessos).orderBy(desc(acessos.em));
    const acessosDoParceiro = todosAcessos.filter((a) => indicacaoIds.has(a.indicacaoId));

    const acessosPorIndicacao = new Map<string, typeof todosAcessos>();
    for (const a of acessosDoParceiro) {
      const list = acessosPorIndicacao.get(a.indicacaoId) || [];
      list.push(a);
      acessosPorIndicacao.set(a.indicacaoId, list);
    }

    const monthFormat = new Intl.DateTimeFormat("sv-SE", {
      year: "numeric",
      month: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
    const currentMonth = monthFormat.format(new Date());

    const all = parceiroIndicacoes.map((ind) => {
      const indAcessos = acessosPorIndicacao.get(ind.id) || [];
      const cliques = indAcessos.length;
      const unicos = new Set(indAcessos.map((a) => a.visitanteId)).size;
      const status = cliques > 0 ? ("acessado" as const) : ("aguardando" as const);

      return {
        ...ind,
        cliente: {
          nome: ind.clienteNome,
          whatsapp: ind.clienteWhatsapp,
          email: ind.clienteEmail || "",
        },
        comissaoAcordada:
          ind.comissaoAcordadaTipo === "fixo"
            ? {
                tipo: "fixo" as const,
                valor: ind.comissaoAcordadaValor,
                moeda: (ind.comissaoAcordadaMoeda as "BRL" | "EUR" | "USD") || "BRL",
              }
            : {
                tipo: "percentual" as const,
                valor: ind.comissaoAcordadaValor,
              },
        acessos: indAcessos,
        cliques,
        unicos,
        status,
        primeiroAcesso: indAcessos.length ? indAcessos[indAcessos.length - 1].em : undefined,
        ultimoAcesso: indAcessos.length ? indAcessos[0].em : undefined,
      };
    });

    const items = all.filter((i) => !statusFilter || i.status === statusFilter);

    const counts = {
      todos: all.length,
      acessado: all.filter((i) => i.cliques > 0).length,
      aguardando: all.filter((i) => !i.cliques).length,
    };

    const mes = all.filter(
      (i) => monthFormat.format(new Date(i.criadaEm)) === currentMonth,
    ).length;

    return {
      parceiro: {
        ...row.parceiro,
        especialidade: row.especialidadeNome || "",
      },
      all,
      items,
      counts,
      mes,
    };
  }
}
