import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  renderEmailTemplate,
  enviarRecuperacaoSenha,
  enviarConviteUsuario,
} from "../lib/email";

describe("Email Templates & Service", () => {
  test("renderEmailTemplate: gera HTML válido conforme o Design System", () => {
    const html = renderEmailTemplate({
      title: "Título de Teste",
      previewText: "Texto de prévia",
      heading: "Cabeçalho Principal",
      paragraphs: ["Primeiro parágrafo", "Segundo parágrafo"],
      buttonText: "Acessar Plataforma",
      buttonUrl: "https://vivasf.com.br/teste",
      secondaryNotice: "Nota auxiliar de segurança.",
    });

    // Estrutura e doctype
    assert.ok(html.includes("<!doctype html>"));
    assert.ok(html.includes('<html lang="pt-BR"'));

    // Design System tokens
    assert.ok(html.includes("https://storybook.vivasf.com.br/email/logo-email.png"));
    assert.ok(html.includes("#FF5436")); // Cor primária / destaque
    assert.ok(html.includes("#00152F")); // Cor de título
    assert.ok(html.includes("#1B365C")); // Cor de texto
    assert.ok(html.includes("#626C80")); // Cor do rodapé e notas
    assert.ok(html.includes("#F7F9FC")); // Fundo externo
    assert.ok(html.includes("#D6DFEC")); // Bordas

    // Conteúdo e botões
    assert.ok(html.includes("Cabeçalho Principal"));
    assert.ok(html.includes("Primeiro parágrafo"));
    assert.ok(html.includes("Segundo parágrafo"));
    assert.ok(html.includes("Acessar Plataforma"));
    assert.ok(html.includes("https://vivasf.com.br/teste"));
    assert.ok(html.includes("Nota auxiliar de segurança."));

    // Redes sociais e rodapé
    assert.ok(html.includes("https://www.instagram.com/vivasemfronteirasbr"));
    assert.ok(html.includes("https://www.youtube.com/@vivasemfronteirasbr"));
    assert.ok(html.includes("https://www.tiktok.com/@vivasemfronteiras"));
    assert.ok(html.includes("Viva Além!"));
    assert.ok(html.includes("{{{RESEND_UNSUBSCRIBE_URL}}}"));
  });

  test("enviarRecuperacaoSenha: gera e envia ou loga mock sem erros", async () => {
    const result = await enviarRecuperacaoSenha({
      email: "teste@vivasf.com.br",
      nome: "Carlos",
      token: "mock-token-12345",
    });

    assert.ok(result.success);
  });

  test("enviarConviteUsuario: gera e envia ou loga mock para parceiro sem erros", async () => {
    const result = await enviarConviteUsuario({
      email: "novo.parceiro@vivasf.com.br",
      nome: "Mariana",
      token: "convite-token-67890",
      tipo: "parceiro",
    });

    assert.ok(result.success);
  });
});
