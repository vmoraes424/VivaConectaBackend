import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const recuperacoesSenha = pgTable("recuperacoes_senha", {
  token: text("token").primaryKey(),
  email: text("email").notNull(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  usado: boolean("usado").notNull().default(false),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
});

export type RecuperacaoSenhaRecord = typeof recuperacoesSenha.$inferSelect;
export type NewRecuperacaoSenhaRecord = typeof recuperacoesSenha.$inferInsert;
