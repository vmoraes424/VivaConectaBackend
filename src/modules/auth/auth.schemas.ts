import { z } from "zod";

export const loginBodySchema = z.object({
  email: z.string().email("Informe seu e-mail"),
  senha: z.string().min(1, "Informe sua senha"),
  lembrar: z.boolean().default(false),
});

export const recuperarSenhaBodySchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
});

export const senhaValidationSchema = z
  .string()
  .min(8, "Use pelo menos 8 caracteres")
  .regex(/[A-Z]/, "Inclua uma letra maiúscula")
  .regex(/\d/, "Inclua um número")
  .regex(/[^a-zA-Z0-9]/, "Inclua um caractere especial");

export const novaSenhaBodySchema = z
  .object({
    token: z.string().min(1, "Token é obrigatório"),
    senha: senhaValidationSchema,
    confirmacao: z.string(),
  })
  .refine((data) => data.senha === data.confirmacao, {
    path: ["confirmacao"],
    message: "As senhas precisam ser iguais",
  });

export const aceitarConviteBodySchema = z
  .object({
    token: z.string().min(1, "Token é obrigatório"),
    senha: senhaValidationSchema,
    confirmacao: z.string(),
  })
  .refine((data) => data.senha === data.confirmacao, {
    path: ["confirmacao"],
    message: "As senhas precisam ser iguais",
  });
