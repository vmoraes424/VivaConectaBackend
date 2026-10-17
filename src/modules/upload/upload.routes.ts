import { FastifyInstance } from "fastify";
import { authenticate } from "../../middlewares/auth";
import { uploadImageToR2, parseDataUrl } from "../../lib/r2";
import { z } from "zod";
import { fileTypeFromBuffer } from "file-type";
import { BadRequestError } from "../../shared/errors";

const ALLOWED_MIMES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const base64UploadSchema = z.object({
  dataUrl: z.string().min(1, "Data URL ou base64 é obrigatório"),
  folder: z.string().optional().default("avatars"),
});

const uploadRateLimit = {
  max: 20,
  timeWindow: "1 minute",
};

export async function uploadRoutes(app: FastifyInstance) {
  // Upload via Multipart (Arquivo binário)
  app.post(
    "/avatar",
    {
      preHandler: [authenticate],
      config: { rateLimit: uploadRateLimit },
    },
    async (request, reply) => {
      const data = await request.file();

      if (!data) {
        throw new BadRequestError("Nenhum arquivo enviado.");
      }

      const buffer = await data.toBuffer();

      if (data.file.truncated || buffer.length > 5 * 1024 * 1024) {
        throw new BadRequestError("Arquivo excede o tamanho máximo de 5MB.");
      }

      // Validação por magic bytes (conteúdo real do arquivo)
      const detected = await fileTypeFromBuffer(buffer);
      if (!detected || !ALLOWED_MIMES[detected.mime]) {
        throw new BadRequestError("Tipo de arquivo não permitido. Envie uma imagem PNG, JPEG ou WebP.");
      }

      const result = await uploadImageToR2(buffer, detected.mime, "avatars");
      return reply.status(201).send(result);
    },
  );

  // Upload via Base64 / Data URL
  app.post(
    "/base64",
    {
      preHandler: [authenticate],
      config: { rateLimit: uploadRateLimit },
    },
    async (request, reply) => {
      const body = base64UploadSchema.parse(request.body);
      const parsed = parseDataUrl(body.dataUrl);

      if (!parsed) {
        throw new BadRequestError("Data URL inválido.");
      }

      if (parsed.buffer.length > 5 * 1024 * 1024) {
        throw new BadRequestError("Arquivo excede o tamanho máximo de 5MB.");
      }

      // Validação por magic bytes (conteúdo real do arquivo)
      const detected = await fileTypeFromBuffer(parsed.buffer);
      if (!detected || !ALLOWED_MIMES[detected.mime]) {
        throw new BadRequestError("Tipo de arquivo não permitido. Envie uma imagem PNG, JPEG ou WebP.");
      }

      const result = await uploadImageToR2(parsed.buffer, detected.mime, body.folder);
      return reply.status(201).send(result);
    },
  );
}
