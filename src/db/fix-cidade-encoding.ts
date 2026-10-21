import postgres from "postgres";
import { env } from "../config/env";

// Corrige cidades gravadas com UTF-8 lido como latin1 (ex.: "ChapecÃ³" -> "Chapecó").
// Uso: node dist/db/fix-cidade-encoding.js          (simulação, não altera nada)
//      node dist/db/fix-cidade-encoding.js --apply  (grava as correções)
const apply = process.argv.includes("--apply");
const client = postgres(env.DATABASE_URL, { max: 1 });

function fixMojibake(str: string): string {
  if (!/[Â-ô][\u0080-¿]/.test(str)) return str;
  const fixed = Buffer.from(str, "latin1").toString("utf8");
  return fixed.includes("�") ? str : fixed;
}

async function run() {
  const rows = await client<{ id: string; cidade: string }[]>`
    select id, cidade from acessos where cidade ~ '[À-ô][\u0080-¿]'
  `;
  const changes = rows
    .map((r) => ({ id: r.id, de: r.cidade, para: fixMojibake(r.cidade) }))
    .filter((c) => c.de !== c.para);

  const resumo = new Map<string, number>();
  for (const c of changes) resumo.set(`${c.de} -> ${c.para}`, (resumo.get(`${c.de} -> ${c.para}`) ?? 0) + 1);
  for (const [k, n] of resumo) console.log(`${n}x ${k}`);
  console.log(`${changes.length} registro(s) a corrigir.`);

  if (!apply) {
    console.log("Simulação: nada foi alterado. Rode com --apply para gravar.");
  } else if (changes.length > 0) {
    await client.begin(async (tx) => {
      for (const c of changes) {
        await tx`update acessos set cidade = ${c.para} where id = ${c.id}`;
      }
    });
    console.log("✅ Correções aplicadas.");
  }
  await client.end();
}

run().catch((err) => {
  console.error("Erro ao corrigir cidades:", err);
  client.end();
  process.exit(1);
});
