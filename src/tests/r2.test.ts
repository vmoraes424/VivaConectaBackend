import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  extractKeyFromUrl,
  deleteImageFromR2,
  deleteImagesFromR2,
} from "../lib/r2";

describe("Cloudflare R2 Storage & Cleanup Tests", () => {
  test("extractKeyFromUrl: extrai a chave a partir de URLs do R2 e caminhos válidos", () => {
    // URL r2.dev padrão
    assert.equal(
      extractKeyFromUrl("https://viva-conecta.r2.dev/avatars/foto-123.jpg"),
      "avatars/foto-123.jpg",
    );

    // URL com porta ou subdomínio
    assert.equal(
      extractKeyFromUrl("https://pub-abcdef123456.r2.dev/avatars/avatar-uuid.png"),
      "avatars/avatar-uuid.png",
    );

    // URL do endpoint S3 da Cloudflare
    assert.equal(
      extractKeyFromUrl(
        "https://account123.r2.cloudflarestorage.com/viva-conecta/avatars/perfil.webp",
      ),
      "avatars/perfil.webp",
    );

    // Chave direta relativa
    assert.equal(
      extractKeyFromUrl("avatars/usuario-foto.jpg"),
      "avatars/usuario-foto.jpg",
    );
  });

  test("extractKeyFromUrl: ignora data URLs (base64), URLs externas e valores vazios", () => {
    // Data URL base64 não deve ser enviado ao R2
    assert.equal(
      extractKeyFromUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA"),
      null,
    );

    // Valores nulos ou vazios
    assert.equal(extractKeyFromUrl(null), null);
    assert.equal(extractKeyFromUrl(undefined), null);
    assert.equal(extractKeyFromUrl(""), null);
    assert.equal(extractKeyFromUrl("   "), null);

    // URL externa não relacionada ao R2
    assert.equal(
      extractKeyFromUrl("https://images.unsplash.com/photo-1534528741775"),
      null,
    );
  });

  test("deleteImageFromR2: processa exclusão simulada em modo mock com sucesso", async () => {
    const result = await deleteImageFromR2(
      "https://viva-conecta.r2.dev/avatars/usuario-teste.png",
    );
    assert.equal(result, true);

    // Retorna false quando não há chave R2 válida
    const invalidResult = await deleteImageFromR2(null);
    assert.equal(invalidResult, false);
  });

  test("deleteImagesFromR2: processa exclusão em lote simulada de múltiplos avatares", async () => {
    // Não deve lançar erro
    await deleteImagesFromR2([
      "https://viva-conecta.r2.dev/avatars/parceiro-1.png",
      "https://viva-conecta.r2.dev/avatars/usuario-2.png",
      null,
      undefined,
      "data:image/jpeg;base64,abcdef",
    ]);

    // Lista vazia não deve lançar erro
    await deleteImagesFromR2([]);
  });
});
