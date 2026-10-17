import { z } from "zod";
import { telefoneSchema } from "../usuarios/usuarios.schemas";

export const codigoIndicacaoSchema = z
  .string()
  .regex(/^VIVA-(?:\d{4,}|[A-HJ-NP-Z2-9]{8})$/);

export const clienteSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome"),
  whatsapp: telefoneSchema,
  email: z
    .union([z.string().trim().email("Informe um e-mail válido"), z.literal("")])
    .optional()
    .default(""),
});

export const indicacaoFormSchema = z.object({
  parceiroId: z.string().min(1, "Escolha um parceiro"),
  cliente: clienteSchema,
  servico: z.string().trim().min(2, "Informe o serviço"),
  observacao: z.string().optional().default(""),
  autorizouCompartilhar: z
    .boolean()
    .refine((val) => val === true, "Precisamos da autorização do cliente"),
});

export const indicacoesQuerySchema = z.object({
  q: z.string().optional(),
  parceiro: z.string().optional(),
  periodo: z.enum(["7", "30", "90", "todos"]).optional().default("todos"),
  status: z.enum(["todos", "acessado", "aguardando"]).optional().default("todos"),
});

export const excluirIndicacoesSchema = z.object({
  ids: z.array(z.string()).min(1, "Informe ao menos uma indicação para exclusão"),
});
