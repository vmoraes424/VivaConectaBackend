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
  status: z.enum(["todos", "acessado", "aguardando", "fechado"]).optional().default("todos"),
});

export const excluirIndicacoesSchema = z.object({
  ids: z.array(z.string()).min(1, "Informe ao menos uma indicação para exclusão"),
});

const valorNegocioSchema = z.object({
  valor: z.number().finite().min(0, "Informe um valor válido").max(Number.MAX_SAFE_INTEGER / 100),
  moeda: z.enum(["BRL", "EUR", "USD"]),
});

const dataFechamentoSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data do fechamento")
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Informe uma data válida");

export const marcarNegocioSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("fechado"),
    valor: valorNegocioSchema.optional(),
    fechadoEm: dataFechamentoSchema,
  }),
  z.object({ status: z.literal("nao_fechou") }),
  z.object({ status: z.literal("em_negociacao") }),
]);

export type MarcarNegocioInput = z.infer<typeof marcarNegocioSchema>;
