import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/viva_conecta"),
  JWT_SECRET: z.string().min(16).default("super-secret-jwt-key-viva-conecta-change-me-in-production"),
  COOKIE_SECRET: z.string().min(16).default("super-secret-cookie-key-viva-conecta-change-me"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),

  // Resend (E-mail)
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("Viva Conecta <nao-responda@vivasf.com.br>"),

  // Cloudflare R2 (Storage de Imagens)
  R2_ACCOUNT_ID: z.string().optional().default(""),
  R2_ACCESS_KEY_ID: z.string().optional().default(""),
  R2_SECRET_ACCESS_KEY: z.string().optional().default(""),
  R2_BUCKET_NAME: z.string().default("viva-conecta"),
  R2_PUBLIC_URL: z.string().optional().default(""),
});

export const env = envSchema.parse(process.env);
