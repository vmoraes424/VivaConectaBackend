import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const codigosEmitidos = pgTable("codigos_emitidos", {
  codigo: text("codigo").primaryKey(),
  emitidoEm: timestamp("emitido_em", { withTimezone: true }).defaultNow().notNull(),
});

export type CodigoEmitidoRecord = typeof codigosEmitidos.$inferSelect;
export type NewCodigoEmitidoRecord = typeof codigosEmitidos.$inferInsert;
