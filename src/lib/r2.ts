import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { env } from "../config/env";
import { randomUUID } from "node:crypto";

const r2Client =
  env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY
    ? new S3Client({
        region: "auto",
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      })
    : null;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

export async function uploadImageToR2(
  buffer: Buffer,
  mimeType: string,
  folder = "avatars",
): Promise<{ url: string; key: string }> {
  const ext = EXTENSIONS[mimeType] || "png";
  const key = `${folder}/${randomUUID()}.${ext}`;

  if (!r2Client) {
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;
    console.log(`\n☁️ [R2 MOCK] Upload simulado para ${key} (${buffer.length} bytes)`);
    return {
      url: dataUrl,
      key,
    };
  }

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });

  await r2Client.send(command);

  const publicBaseUrl = env.R2_PUBLIC_URL
    ? env.R2_PUBLIC_URL.replace(/\/$/, "")
    : `https://${env.R2_BUCKET_NAME}.r2.dev`;

  const url = `${publicBaseUrl}/${key}`;
  return { url, key };
}

export function parseDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  return { buffer, mimeType };
}

/**
 * Extrai a chave (object key) do Cloudflare R2 a partir de uma URL ou caminho.
 * Suporta:
 * - URLs públicas do R2 (ex: https://pub-xxx.r2.dev/avatars/uuid.png)
 * - URLs com domínio customizado (ex: https://cdn.exemplo.com/avatars/uuid.png)
 * - Chaves diretas (ex: avatars/uuid.png)
 * Ignora data URLs (base64) e URLs externas (ex: unplash).
 */
export function extractKeyFromUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const parsed = new URL(trimmed);
      let pathname = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");

      // Caso a URL tenha o prefixo do bucket (ex: endpoint path-style)
      if (env.R2_BUCKET_NAME && pathname.startsWith(`${env.R2_BUCKET_NAME}/`)) {
        pathname = pathname.slice(env.R2_BUCKET_NAME.length + 1);
      }

      const isR2Dev = parsed.hostname.endsWith(".r2.dev");
      const isR2Storage = parsed.hostname.endsWith(".r2.cloudflarestorage.com");
      const isConfiguredPublic = Boolean(
        env.R2_PUBLIC_URL &&
          new URL(env.R2_PUBLIC_URL).hostname === parsed.hostname,
      );

      // Deve pertencer ao R2 ou ser um arquivo na pasta avatars
      if (isR2Dev || isR2Storage || isConfiguredPublic || pathname.startsWith("avatars/")) {
        const parts = pathname.split("/");
        if (parts.length >= 2 && parts[parts.length - 1].length > 0) {
          return pathname;
        }
      }

      return null;
    }

    if (trimmed.startsWith("avatars/")) {
      return trimmed;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Exclui uma imagem do Cloudflare R2.
 */
export async function deleteImageFromR2(
  urlOrKey: string | null | undefined,
): Promise<boolean> {
  const key = extractKeyFromUrl(urlOrKey);
  if (!key) return false;

  if (!r2Client) {
    console.log(`\n☁️ [R2 MOCK] Exclusão simulada para ${key}`);
    return true;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    });
    await r2Client.send(command);
    console.log(`\n☁️ [R2] Imagem excluída com sucesso: ${key}`);
    return true;
  } catch (err) {
    console.error(`\n❌ [R2] Falha ao excluir imagem ${key}:`, err);
    return false;
  }
}

/**
 * Exclui múltiplas imagens do Cloudflare R2 em lote.
 */
export async function deleteImagesFromR2(
  urlsOrKeys: (string | null | undefined)[],
): Promise<void> {
  const keys = Array.from(
    new Set(
      urlsOrKeys
        .map(extractKeyFromUrl)
        .filter((k): k is string => Boolean(k)),
    ),
  );

  if (keys.length === 0) return;

  if (!r2Client) {
    console.log(
      `\n☁️ [R2 MOCK] Exclusão em lote simulada para ${keys.length} imagens: ${keys.join(", ")}`,
    );
    return;
  }

  try {
    if (keys.length === 1) {
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: keys[0],
        }),
      );
    } else {
      const chunks: string[][] = [];
      for (let i = 0; i < keys.length; i += 1000) {
        chunks.push(keys.slice(i, i + 1000));
      }

      for (const chunk of chunks) {
        const command = new DeleteObjectsCommand({
          Bucket: env.R2_BUCKET_NAME,
          Delete: {
            Objects: chunk.map((Key) => ({ Key })),
            Quiet: true,
          },
        });
        await r2Client.send(command);
      }
    }
    console.log(`\n☁️ [R2] ${keys.length} imagem(ns) excluída(s) com sucesso.`);
  } catch (err) {
    console.error(`\n❌ [R2] Falha ao excluir imagens em lote:`, err);
  }
}
