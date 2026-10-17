import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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
