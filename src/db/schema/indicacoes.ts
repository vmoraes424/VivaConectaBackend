import { pgTable, text, boolean, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { parceiros } from "./parceiros";

export const indicacoes = pgTable("indicacoes", {
  id: text("id").primaryKey(),
  codigo: text("codigo").notNull().unique(),
  parceiroId: text("parceiro_id")
    .notNull()
    .references(() => parceiros.id, { onDelete: "cascade" }),
  clienteNome: text("cliente_nome").notNull(),
  clienteWhatsapp: text("cliente_whatsapp").notNull(),
  clienteEmail: text("cliente_email"),
  servico: text("servico").notNull(),
  observacao: text("observacao").default(""),
  autorizouCompartilhar: boolean("autorizou_compartilhar").notNull().default(true),
  comissaoAcordadaTipo: text("comissao_acordada_tipo").notNull(),
  comissaoAcordadaValor: doublePrecision("comissao_acordada_valor").notNull(),
  comissaoAcordadaMoeda: text("comissao_acordada_moeda"),
  negocioStatus: text("negocio_status"), // 'fechado' | 'nao_fechou' | null (em negociação)
  negocioValor: doublePrecision("negocio_valor"),
  negocioMoeda: text("negocio_moeda"),
  negocioFechadoEm: text("negocio_fechado_em"), // YYYY-MM-DD
  negocioMarcadoPor: text("negocio_marcado_por"),
  negocioMarcadoEm: timestamp("negocio_marcado_em", { withTimezone: true }),
  criadaPor: text("criada_por").notNull(),
  criadaEm: timestamp("criada_em", { withTimezone: true }).defaultNow().notNull(),
});

export type IndicacaoRecord = typeof indicacoes.$inferSelect;
export type NewIndicacaoRecord = typeof indicacoes.$inferInsert;
