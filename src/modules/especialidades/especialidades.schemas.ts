import { z } from "zod";

export const especialidadeBodySchema = z.object({
  nome: z.string().trim().min(2, "Informe a especialidade"),
});
