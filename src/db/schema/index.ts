import { relations } from "drizzle-orm";
import { especialidades } from "./especialidades";
import { parceiros } from "./parceiros";
import { indicacoes } from "./indicacoes";
import { codigosEmitidos } from "./codigos-emitidos";
import { acessos } from "./acessos";
import { usuarios } from "./usuarios";
import { recuperacoesSenha } from "./recuperacao-senha";

export * from "./especialidades";
export * from "./parceiros";
export * from "./indicacoes";
export * from "./codigos-emitidos";
export * from "./acessos";
export * from "./usuarios";
export * from "./recuperacao-senha";

export const especialidadesRelations = relations(especialidades, ({ many }) => ({
    parceiros: many(parceiros),
}));

export const parceirosRelations = relations(parceiros, ({ one, many }) => ({
    especialidade: one(especialidades, {
        fields: [parceiros.especialidadeId],
        references: [especialidades.id],
    }),
    indicacoes: many(indicacoes),
    usuarios: many(usuarios),
}));

export const indicacoesRelations = relations(indicacoes, ({ one, many }) => ({
    parceiro: one(parceiros, {
        fields: [indicacoes.parceiroId],
        references: [parceiros.id],
    }),
    acessos: many(acessos),
}));

export const acessosRelations = relations(acessos, ({ one }) => ({
    indicacao: one(indicacoes, {
        fields: [acessos.indicacaoId],
        references: [indicacoes.id],
    }),
}));

export const usuariosRelations = relations(usuarios, ({ one }) => ({
    parceiro: one(parceiros, {
        fields: [usuarios.parceiroId],
        references: [parceiros.id],
    }),
}));
