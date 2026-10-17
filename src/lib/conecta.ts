export const normalizar = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const linkIndicacao = (codigo: string, origin = "https://conecta.vivasf.com.br"): string =>
  `${origin}/i/${codigo}`;

export const mensagemParceiro = (
  nome: string,
  parceiro: string,
  codigo: string,
): string =>
  `Oi, ${nome.split(" ")[0]}! Aqui é da ${parceiro}. Recebi sua indicação pela Viva Sem Fronteiras (código ${codigo}). Como posso te ajudar?`;

export const mensagemPublica = (codigo: string, parceiro: string): string =>
  `Olá ${parceiro}! Recebi sua indicação pelo Viva Sem Fronteiras e gostaria de saber mais sobre seus serviços. Meu código de indicação é ${codigo}.`;

export const linkWhatsapp = (number: string, message = ""): string =>
  `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;

export const nextCode = (emitidos: Iterable<string>): string => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const usados = new Set(emitidos);
  for (let attempt = 0; attempt < 10; attempt++) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const codigo = `VIVA-${Array.from(bytes, (byte) => alphabet[byte % 32]).join("")}`;
    if (/[A-Z]/.test(codigo.slice(5)) && !usados.has(codigo)) return codigo;
  }
  throw new Error("Não foi possível gerar um código único. Tente novamente.");
};
