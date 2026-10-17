import { db } from "../../db/index";
import { indicacoes } from "../../db/schema/indicacoes";
import { parceiros } from "../../db/schema/parceiros";
import { acessos } from "../../db/schema/acessos";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { mensagemPublica, linkWhatsapp } from "../../lib/conecta";

export class PublicoService {
  async validarCodigo(codigo: string) {
    const [row] = await db
      .select({
        indicacao: indicacoes,
        parceiro: parceiros,
      })
      .from(indicacoes)
      .innerJoin(parceiros, eq(indicacoes.parceiroId, parceiros.id))
      .where(eq(indicacoes.codigo, codigo))
      .limit(1);

    if (!row) return null;

    const { indicacao, parceiro } = row;
    const nomeDestino = parceiro.empresa?.trim() || parceiro.nome;
    const url = linkWhatsapp(
      parceiro.whatsapp,
      mensagemPublica(indicacao.codigo, nomeDestino),
    );

    return {
      codigo: indicacao.codigo,
      nome: parceiro.nome,
      url,
    };
  }

  async registrarAcesso(
    codigo: string,
    details: {
      visitanteId?: string;
      userAgent?: string;
      cidade?: string;
      uf?: string;
      origem?: "WhatsApp" | "Navegador";
    },
  ) {
    const [row] = await db
      .select({
        indicacao: indicacoes,
        parceiro: parceiros,
      })
      .from(indicacoes)
      .innerJoin(parceiros, eq(indicacoes.parceiroId, parceiros.id))
      .where(eq(indicacoes.codigo, codigo))
      .limit(1);

    if (!row) return null;

    const { indicacao, parceiro } = row;
    const visitanteId = details.visitanteId || randomUUID();
    const ua = details.userAgent || "";

    const aparelho: "iPhone" | "Android" | "Desktop" = /iPhone/i.test(ua)
      ? "iPhone"
      : /Android/i.test(ua)
        ? "Android"
        : "Desktop";

    const acessoId = randomUUID();
    const now = new Date();

    await db.insert(acessos).values({
      id: acessoId,
      indicacaoId: indicacao.id,
      em: now,
      visitanteId,
      cidade: details.cidade || "São Paulo",
      uf: details.uf || "SP",
      aparelho,
      origem: details.origem || "Navegador",
    });

    const nomeDestino = parceiro.empresa?.trim() || parceiro.nome;
    const url = linkWhatsapp(
      parceiro.whatsapp,
      mensagemPublica(indicacao.codigo, nomeDestino),
    );

    return {
      codigo: indicacao.codigo,
      nome: parceiro.nome,
      url,
      visitanteId,
    };
  }
}
