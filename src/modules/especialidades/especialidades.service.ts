import { db } from "../../db/index";
import { especialidades } from "../../db/schema/especialidades";
import { parceiros } from "../../db/schema/parceiros";
import { eq, ne, and, asc } from "drizzle-orm";
import { normalizar } from "../../lib/conecta";
import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError } from "../../shared/errors";

export class EspecialidadesService {
  async listar() {
    return db.select().from(especialidades).orderBy(asc(especialidades.nome));
  }

  async criar(nome: string) {
    const nomeNormalizado = normalizar(nome);

    const [existente] = await db
      .select()
      .from(especialidades)
      .where(eq(especialidades.nomeNormalizado, nomeNormalizado))
      .limit(1);

    if (existente) {
      return existente;
    }

    const id = randomUUID();
    await db.insert(especialidades).values({
      id,
      nome: nome.trim(),
      nomeNormalizado,
    });

    const [created] = await db
      .select()
      .from(especialidades)
      .where(eq(especialidades.id, id))
      .limit(1);

    return created!;
  }

  async atualizar(id: string, nome: string) {
    const [existente] = await db
      .select()
      .from(especialidades)
      .where(eq(especialidades.id, id))
      .limit(1);

    if (!existente) {
      throw new NotFoundError("Especialidade não encontrada.");
    }

    const nomeNormalizado = normalizar(nome);

    const [duplicada] = await db
      .select()
      .from(especialidades)
      .where(
        and(
          eq(especialidades.nomeNormalizado, nomeNormalizado),
          ne(especialidades.id, id),
        ),
      )
      .limit(1);

    if (duplicada) {
      throw new ConflictError("Já existe uma especialidade com esse nome.");
    }

    await db
      .update(especialidades)
      .set({
        nome: nome.trim(),
        nomeNormalizado,
      })
      .where(eq(especialidades.id, id));

    const [updated] = await db
      .select()
      .from(especialidades)
      .where(eq(especialidades.id, id))
      .limit(1);

    return updated!;
  }

  async excluir(id: string) {
    const [parceiroVinculado] = await db
      .select()
      .from(parceiros)
      .where(eq(parceiros.especialidadeId, id))
      .limit(1);

    if (parceiroVinculado) {
      throw new ConflictError(
        "Esta especialidade está em uso. Altere a especialidade dos parceiros vinculados antes de excluir.",
      );
    }

    const [existente] = await db
      .select()
      .from(especialidades)
      .where(eq(especialidades.id, id))
      .limit(1);

    if (!existente) {
      throw new NotFoundError("Especialidade não encontrada.");
    }

    await db.delete(especialidades).where(eq(especialidades.id, id));
    return { success: true };
  }
}
