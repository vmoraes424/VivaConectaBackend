import { z } from "zod";

export const telefoneSchema = z
  .string()
  .refine((val) => !val || /^\+[1-9]\d{7,14}$/.test(val), "Informe DDI e número válidos");

export const avatarSchema = z
  .string()
  .max(300000, "Escolha uma imagem menor")
  .refine(
    (value) =>
      !value ||
      /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(value),
    "Imagem inválida",
  );

export const usuarioFormSchema = z
  .object({
    nome: z.string().trim().min(1, "Informe o nome").max(100),
    email: z.string().trim().toLowerCase().email("Informe um e-mail válido"),
    tipo: z.enum(["administrador", "editor", "parceiro"]),
    acessos: z.array(z.enum(["visao-geral", "parceiros", "indicacoes"])).default([]),
    parceiroId: z.string().default(""),
    ativo: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.tipo === "editor" && !value.acessos.length) {
      ctx.addIssue({
        code: "custom",
        path: ["acessos"],
        message: "Escolha pelo menos uma área",
      });
    }
    if (value.tipo === "parceiro" && !value.parceiroId) {
      ctx.addIssue({
        code: "custom",
        path: ["parceiroId"],
        message: "Selecione o parceiro",
      });
    }
  });

export const perfilSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(100),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido"),
  telefone: telefoneSchema.optional().default(""),
  localidade: z.string().trim().max(100).optional().default(""),
  avatarUrl: avatarSchema.optional().default(""),
});
