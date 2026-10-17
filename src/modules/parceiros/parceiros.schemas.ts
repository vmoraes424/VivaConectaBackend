import { z } from "zod";
import { telefoneSchema, avatarSchema } from "../usuarios/usuarios.schemas";

export const comissaoSchema = z.discriminatedUnion("tipo", [
  z.object({
    tipo: z.literal("percentual"),
    valor: z.number().min(0).max(100),
  }),
  z.object({
    tipo: z.literal("fixo"),
    valor: z.number().min(0),
    moeda: z.enum(["BRL", "EUR", "USD"]),
  }),
]);

export const parceiroInputSchema = z.object({
  id: z.string().optional(),
  nome: z.string().trim().min(2, "Informe o nome"),
  empresa: z.string().optional().default(""),
  avatarUrl: avatarSchema.optional().default(""),
  localidade: z.string().trim().optional().default(""),
  especialidadeId: z.string().min(1, "Selecione uma especialidade"),
  descricao: z.string().optional().default(""),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido"),
  whatsapp: telefoneSchema,
  comissao: comissaoSchema,
  ativo: z.boolean().default(true),
  convidar: z.boolean().optional().default(false),
});

export const parceirosQuerySchema = z.object({
  q: z.string().optional(),
  especialidade: z.string().optional(),
  status: z.enum(["todos", "ativo", "inativo"]).optional().default("todos"),
});

export const excluirEmMassaSchema = z.object({
  ids: z.array(z.string()).min(1, "Informe ao menos um parceiro para exclusão"),
});
