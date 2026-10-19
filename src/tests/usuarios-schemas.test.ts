import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { usuarioFormSchema } from "../modules/usuarios/usuarios.schemas";

describe("Usuarios Schemas & Avatar Integration", () => {
  test("usuarioFormSchema aceita avatarUrl com URL pública do R2", () => {
    const validData = {
      nome: "Carlos Silva",
      email: "carlos@parceiro.com",
      tipo: "parceiro" as const,
      parceiroId: "p1",
      ativo: true,
      avatarUrl: "https://viva-conecta.r2.dev/avatars/foto-carlos.jpg",
    };

    const parsed = usuarioFormSchema.parse(validData);
    assert.equal(parsed.avatarUrl, "https://viva-conecta.r2.dev/avatars/foto-carlos.jpg");
  });

  test("usuarioFormSchema aceita avatarUrl em base64 / data URL", () => {
    const validData = {
      nome: "Mariana Souza",
      email: "mariana@empresa.com",
      tipo: "administrador" as const,
      parceiroId: "",
      ativo: true,
      avatarUrl: "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAgA0JaQAA3AA/vuUAAA=",
    };

    const parsed = usuarioFormSchema.parse(validData);
    assert.ok(parsed.avatarUrl?.startsWith("data:image/webp;base64,"));
  });

  test("usuarioFormSchema permite avatarUrl vazio e define default", () => {
    const validData = {
      nome: "Ana Lima",
      email: "ana@editor.com",
      tipo: "editor" as const,
      acessos: ["indicacoes" as const],
      parceiroId: "",
      ativo: true,
    };

    const parsed = usuarioFormSchema.parse(validData);
    assert.equal(parsed.avatarUrl, "");
  });

  test("usuarioFormSchema rejeita URL com protocolo inseguro/inválido", () => {
    const invalidData = {
      nome: "Teste Invalido",
      email: "invalido@teste.com",
      tipo: "administrador" as const,
      parceiroId: "",
      ativo: true,
      avatarUrl: "ftp://servidor.com/foto.jpg",
    };

    assert.throws(() => usuarioFormSchema.parse(invalidData), /Imagem inválida/);
  });
});
