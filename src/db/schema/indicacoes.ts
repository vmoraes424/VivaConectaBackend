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
  criadaPor: text("criada_por").notNull(),
  criadaEm: timestamp("criada_em", { withTimezone: true }).defaultNow().notNull(),
});

export type IndicacaoRecord = typeof indicacoes.$inferSelect;
export type NewIndicacaoRecord = typeof indicacoes.$inferInsert;
