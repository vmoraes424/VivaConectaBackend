import { db, queryClient } from "./index";
import {
  especialidades,
  parceiros,
  indicacoes,
  codigosEmitidos,
  acessos,
  usuarios,
} from "./schema/index";
import { normalizar } from "../lib/conecta";
import { hashPassword } from "../lib/password";

export async function runSeed() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // Limpar tabelas existentes
  await db.delete(acessos);
  await db.delete(indicacoes);
  await db.delete(codigosEmitidos);
  await db.delete(usuarios);
  await db.delete(parceiros);
  await db.delete(especialidades);

  // 1. Especialidades
  const especialidadesData = [
    "Relocation",
    "Imigração",
    "Imobiliária",
    "Mentoria de carreira",
    "Contabilidade",
    "Idiomas",
    "Documentação",
    "Seguros",
    "Educação",
    "Tecnologia",
  ].map((nome, i) => ({
    id: `e${i + 1}`,
    nome,
    nomeNormalizado: normalizar(nome),
    criadoEm: new Date("2026-09-01T10:00:00Z"),
  }));

  await db.insert(especialidades).values(especialidadesData);
  console.log(`✓ ${especialidadesData.length} especialidades inseridas.`);

  // 2. Parceiros
  const nomesParceiros = [
    "Horizonte Relocation",
    "Ortega Abogados",
    "Casa Nova Imóveis",
    "Ana Lima",
    "Atlas Contabilidade",
    "Fala Fluente",
    "Torres Relocation",
  ];
  const emailsParceiros = [
    "contato@horizonte.com",
    "hola@ortega.es",
    "atendimento@casanova.es",
    "ana@analima.com",
    "contato@atlas.com",
    "oi@falafluente.com",
    "contato@torres.com",
  ];
  const whatsappsParceiros = [
    "+34612345678",
    "+34931220415",
    "+34963118240",
    "+5511987654321",
    "+5541998123344",
    "+5521996541020",
    "+34612345679",
  ];

  const parceirosData = nomesParceiros.map((nome, i) => {
    let comissaoTipo = "percentual";
    let comissaoValor = [10, 15, 0, 20, 0, 10, 10][i];
    let comissaoMoeda: string | undefined = undefined;

    if (i === 2) {
      comissaoTipo = "fixo";
      comissaoValor = 80;
      comissaoMoeda = "EUR";
    } else if (i === 4) {
      comissaoTipo = "fixo";
      comissaoValor = 150;
      comissaoMoeda = "BRL";
    }

    return {
      id: `p${i + 1}`,
      nome,
      empresa: nome,
      email: emailsParceiros[i],
      localidade: i === 0 ? "Madri" : undefined,
      especialidadeId: `e${[1, 2, 3, 4, 5, 6, 1][i]}`,
      descricao: "",
      whatsapp: whatsappsParceiros[i],
      comissaoTipo,
      comissaoValor,
      comissaoMoeda,
      ativo: i !== 5,
      criadoEm: new Date("2026-09-01T12:00:00Z"),
    };
  });

  await db.insert(parceiros).values(parceirosData);
  console.log(`✓ ${parceirosData.length} parceiros inseridos.`);

  // 3. Usuários
  const defaultPasswordHash = await hashPassword("Viva2026!");
  const usuariosData = [
    {
      id: "u1",
      nome: "Fernanda Silva",
      email: "admin@vivasf.com.br",
      senhaHash: defaultPasswordHash,
      papel: "admin",
      perfil: "administrador",
      acessos: ["visao-geral", "parceiros", "indicacoes"],
      ativo: true,
      convitePendente: false,
    },
    {
      id: "u2",
      nome: "Horizonte Relocation",
      email: "contato@horizonte.com",
      senhaHash: defaultPasswordHash,
      papel: "parceiro",
      perfil: "administrador",
      acessos: [],
      parceiroId: "p1",
      ativo: true,
      convitePendente: false,
    },
    {
      id: "u3",
      nome: "Torres Relocation",
      email: "contato@torres.com",
      senhaHash: defaultPasswordHash,
      papel: "parceiro",
      perfil: "administrador",
      acessos: [],
      parceiroId: "p7",
      ativo: true,
      convitePendente: false,
    },
  ];

  await db.insert(usuarios).values(usuariosData);
  console.log(`✓ ${usuariosData.length} usuários inseridos.`);

  // 4. Indicações
  const nomesClientes = [
    "Mariana Costa",
    "Pedro Santos",
    "Juliana Almeida",
    "Rafael Oliveira",
    "Camila Rodrigues",
    "Lucas Ferreira",
    "Beatriz Souza",
    "Fernanda Lima",
    "Gabriel Martins",
    "Ana Paula Silva",
    "Bruno Pereira",
    "Carolina Mendes",
    "Thiago Ribeiro",
    "Isabela Rocha",
  ];

  const indicacoesData = Array.from({ length: 48 }, (_, i) => {
    const pIndex = i < 14 ? 0 : i < 25 ? 1 : i < 34 ? 2 : i < 41 ? 3 : i < 46 ? 4 : 5;
    const p = parceirosData[pIndex];
    const codigo = `VIVA-${1052 - i}`;

    return {
      id: `i${i + 1}`,
      codigo,
      parceiroId: p.id,
      clienteNome: nomesClientes[i % nomesClientes.length],
      clienteWhatsapp: `+55119${String(87654321 + i).padStart(8, "0")}`,
      clienteEmail: i % 3 === 0 ? undefined : `cliente${i + 1}@exemplo.com`,
      servico: [
        "Mudança para a Espanha",
        "Assessoria de imigração",
        "Busca de imóvel",
        "Planejamento de carreira",
        "Abertura de empresa",
        "Conversação em espanhol",
      ][Number(p.id.slice(1)) - 1],
      observacao:
        i % 2 === 0
          ? "Pretende se mudar nos próximos meses. Prefere contato à tarde."
          : "",
      autorizouCompartilhar: true,
      comissaoAcordadaTipo: p.comissaoTipo,
      comissaoAcordadaValor: p.comissaoValor,
      comissaoAcordadaMoeda: p.comissaoMoeda,
      criadaPor: "Fernanda Silva",
      criadaEm: new Date(Date.now() - ((i + 1) * 86400000) / 2),
    };
  });

  await db.insert(indicacoes).values(indicacoesData);
  console.log(`✓ ${indicacoesData.length} indicações inseridas.`);

  // 5. Códigos Emitidos
  const codigosData = indicacoesData.map((ind) => ({
    codigo: ind.codigo,
    emitidoEm: ind.criadaEm,
  }));
  await db.insert(codigosEmitidos).values(codigosData);
  console.log(`✓ ${codigosData.length} códigos emitidos registrados.`);

  // 6. Acessos
  const accessedIndices = Array.from({ length: 37 }, (_, i) =>
    i < 12
      ? i
      : i < 21
        ? i + 2
        : i < 27
          ? i + 4
          : i < 33
            ? i + 7
            : i < 36
              ? i + 8
              : 46,
  );

  const acessosData = Array.from({ length: 132 }, (_, n) => {
    const indIndex = accessedIndices[n % accessedIndices.length];
    const ind = indicacoesData[indIndex];
    return {
      id: `a${n + 1}`,
      indicacaoId: ind.id,
      em: new Date(ind.criadaEm.getTime() + 3600000 + Math.floor(n / 37) * 1800000),
      visitanteId: `v${n < 97 ? n : n - 97}`,
      cidade: n % 2 ? "São Paulo" : "Madrid",
      uf: n % 2 ? "SP" : "ES",
      aparelho: n % 2 ? "iPhone" : "Android",
      origem: "WhatsApp",
    };
  });

  await db.insert(acessos).values(acessosData);
  console.log(`✓ ${acessosData.length} acessos inseridos.`);

  console.log("✅ Seed concluído com sucesso!");
}

if (process.argv[1]?.includes("seed")) {
  runSeed()
    .then(() => {
      queryClient.end();
      process.exit(0);
    })
    .catch((err) => {
      console.error("Erro ao rodar seed:", err);
      queryClient.end();
      process.exit(1);
    });
}
