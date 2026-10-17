import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { indicacoes } from "./indicacoes";

export const acessos = pgTable("acessos", {
  id: text("id").primaryKey(),
  indicacaoId: text("indicacao_id")
    .notNull()
    .references(() => indicacoes.id, { onDelete: "cascade" }),
  em: timestamp("em", { withTimezone: true }).defaultNow().notNull(),
  visitanteId: text("visitante_id").notNull(),
  cidade: text("cidade").notNull(),
  uf: text("uf").notNull(),
  aparelho: text("aparelho").notNull(), // 'iPhone' | 'Android' | 'Desktop'
  origem: text("origem").notNull(), // 'WhatsApp' | 'Navegador'
});

export type AcessoRecord = typeof acessos.$inferSelect;
export type NewAcessoRecord = typeof acessos.$inferInsert;
