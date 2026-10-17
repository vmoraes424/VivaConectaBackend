import { pgTable, text, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { parceiros } from "./parceiros";

export const usuarios = pgTable("usuarios", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  papel: text("papel").notNull(), // 'admin' | 'parceiro'
  perfil: text("perfil").notNull().default("administrador"), // 'administrador' | 'editor'
  acessos: jsonb("acessos").$type<string[]>().notNull().default([]), // ['visao-geral', 'parceiros', 'indicacoes']
  parceiroId: text("parceiro_id").references(() => parceiros.id, { onDelete: "cascade" }),
  ativo: boolean("ativo").notNull().default(true),
  convitePendente: boolean("convite_pendente").notNull().default(false),
  conviteToken: text("convite_token").unique(),
  conviteExpiraEm: timestamp("convite_expira_em", { withTimezone: true }),
  ultimoAcesso: timestamp("ultimo_acesso", { withTimezone: true }),
  telefone: text("telefone"),
  localidade: text("localidade"),
  avatarUrl: text("avatar_url"),
  tentativasFalhas: integer("tentativas_falhas").notNull().default(0),
  bloqueadoAte: timestamp("bloqueado_ate", { withTimezone: true }),
});

export type UsuarioRecord = typeof usuarios.$inferSelect;
export type NewUsuarioRecord = typeof usuarios.$inferInsert;
