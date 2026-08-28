/**
 * Aplica um arquivo .sql no banco.
 *
 *   npx tsx --env-file=.env.local scripts/aplicar-sql.ts drizzle/0001_render_jobs.sql
 *
 * Existe porque o `drizzle-kit push` estoura ao introspectar este banco
 * (TypeError lendo CHECK constraint). Enquanto isso não for corrigido, o DDL
 * novo vem escrito à mão em drizzle/ e é aplicado por aqui.
 */
import { readFile } from "node:fs/promises";
import postgres from "postgres";

const arquivo = process.argv[2];
if (!arquivo) {
  console.error("uso: aplicar-sql.ts <arquivo.sql>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não definida");

// Sem top-level await: o tsx transpila este script como CJS.
async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  await sql.unsafe(await readFile(arquivo, "utf8"));
  await sql.end();
  console.log(`aplicado: ${arquivo}`);
}

main();
