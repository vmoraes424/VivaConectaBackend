import { pgTable, text, boolean, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { especialidades } from "./especialidades";

export const parceiros = pgTable("parceiros", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  empresa: text("empresa"),
  avatarUrl: text("avatar_url"),
  localidade: text("localidade"),
  especialidadeId: text("especialidade_id")
    .notNull()
    .references(() => especialidades.id),
  descricao: text("descricao").notNull().default(""),
  email: text("email").notNull(),
  whatsapp: text("whatsapp").notNull(),
  comissaoTipo: text("comissao_tipo").notNull(), // 'percentual' | 'fixo'
  comissaoValor: doublePrecision("comissao_valor").notNull(),
  comissaoMoeda: text("comissao_moeda"), // 'BRL' | 'EUR' | 'USD'
  ativo: boolean("ativo").notNull().default(true),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
});

export type ParceiroRecord = typeof parceiros.$inferSelect;
export type NewParceiroRecord = typeof parceiros.$inferInsert;
