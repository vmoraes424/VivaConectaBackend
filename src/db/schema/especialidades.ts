import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const especialidades = pgTable("especialidades", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  nomeNormalizado: text("nome_normalizado").notNull().unique(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
});

export type EspecialidadeRecord = typeof especialidades.$inferSelect;
export type NewEspecialidadeRecord = typeof especialidades.$inferInsert;
